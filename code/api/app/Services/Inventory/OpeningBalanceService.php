<?php

namespace App\Services\Inventory;

use App\Actions\Inventory\EnsureVariantLocationAssignment;
use App\DataTransferObjects\Inventory\InventoryEntryLineData;
use App\DataTransferObjects\Inventory\InventoryEntryPostingData;
use App\DataTransferObjects\Inventory\RegisterOpeningBalanceData;
use App\Exceptions\UomConversionNotFoundException;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\StockMovement;
use App\Models\UnitOfMeasure;
use App\Models\User;
use App\Services\Inventory\Concerns\ConvertsUomQuantities;
use App\Support\Access\OperatingUnitScope;
use App\Support\Clock\ApplicationClock;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OpeningBalanceService
{
    use ConvertsUomQuantities;

    private const INACTIVE_DESTINATION_MESSAGE = 'The selected location is inactive and cannot receive an opening balance.';

    /** Decimal places of `stock_movements.qty` / `stock_movement_lines.base_qty` (decimal(15,4)). */
    private const BASE_QUANTITY_SCALE = 4;

    public function __construct(
        private readonly ApplicationClock $clock,
        private readonly InventoryEntryPostingService $entryPosting,
        private readonly EnsureVariantLocationAssignment $assignmentEnsurer,
        private readonly OperatingUnitScope $scope,
    ) {}

    /**
     * Register opening balance for an item variant at a specific location.
     *
     * Opening Balance is an explicit, immediately-posted `OPENING_BALANCE`
     * movement with no source Location and no source-document identity (#570) —
     * a manual entry that carries no idempotency contract, so repeated calls are
     * auditable additions rather than replays. The same transaction also ensures
     * the Variant-to-Location assignment (#569) and blends the destination
     * `Stock.weighted_avg_cost` (#434).
     *
     * @throws ValidationException when the destination Location is inactive, or no
     *                             UOM conversion path exists to the Variant's base UOM
     * @throws \Illuminate\Auth\Access\AuthorizationException when the caller no longer
     *                                                        has access to the destination's Operating Unit
     */
    public function registerOpeningBalance(RegisterOpeningBalanceData $data): StockMovement
    {
        return DB::transaction(function () use ($data) {
            // Revalidate the destination at mutation time (#570): it must still
            // exist, still be active, and still belong to an Operating Unit the
            // caller can act within — the FormRequest checked all three before
            // the transaction, but a state change in between must not slip past.
            $location = InventoryLocation::query()
                ->whereKey($data->inventoryLocationId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertDestinationActive($location);

            if ($data->userId !== null) {
                $this->scope->assertCanAccessLocation(User::findOrFail($data->userId), $location);
            }

            $variant = ItemVariant::with(['item', 'unitOfMeasure'])->findOrFail($data->itemVariantId);
            $entryUom = UnitOfMeasure::findOrFail($data->entryUomId);

            [$baseQuantity, $conversionFactor] = $this->convertOrFailValidation($data, $variant, $entryUom);
            $baseCost = $this->calculateBaseCost($data->unitCost, $conversionFactor);

            // One posting primitive writes the immutable movement + line,
            // race-safely creates/increments Stock, and blends the
            // weighted-average cost (#567). An Opening Balance has no source
            // document, so it carries no source-line identity — it stays a
            // manual entry with no idempotency contract. A null cost skips the
            // blend; an explicit 0 still blends (e.g. free stock).
            $movement = $this->entryPosting->post(new InventoryEntryPostingData(
                inventoryLocationId: $location->id,
                itemVariantId: $variant->id,
                baseQuantity: $baseQuantity,
                reason: StockMovement::REASON_OPENING_BALANCE,
                userId: $data->userId,
                unitCost: $baseCost,
                reference: $data->reference,
                notes: $data->notes,
                movementMeta: [
                    'original_qty' => $data->quantity,
                    'original_uom' => $entryUom->code,
                    'original_uom_id' => $data->entryUomId,
                    'conversion_factor' => $conversionFactor,
                    'unit_cost' => $data->unitCost,
                    'base_cost' => $baseCost,
                ],
                postedAt: $this->clock->nowUtc(),
                line: new InventoryEntryLineData(
                    uomId: $data->entryUomId,
                    qty: $data->quantity,
                    baseQty: $baseQuantity,
                    conversionFactor: $conversionFactor,
                    unitCost: $baseCost,
                    // Explicit null check, not a truthy one: a supplied cost of 0
                    // (free stock) records line_total = 0, matching the preview's
                    // total_value and the weighted-average blend; only a genuinely
                    // omitted cost leaves it null, so line-level audits can still
                    // tell "free" from "cost not captured" (#570).
                    lineTotal: $baseCost === null ? null : $baseQuantity * $baseCost,
                ),
            ));

            // Ensure the managed-assortment assignment for the pair (#569) *after*
            // the posting primitive, so it runs while this transaction holds the
            // lock `InventoryEntryPostingService` took on the pair's Stock row
            // (StockMutationService::lockAndGet). That is the exact pair-level
            // serialization point UnassignVariantFromLocationController uses, so a
            // concurrent unassignment of a pair that *has* a Stock row (a zeroed
            // one included) cannot slip its zero-balance check and soft-delete
            // between the assignment decision and the Stock increment — the
            // opened balance is always left discoverable in the Location's
            // assignment list, and a soft-deleted row from an unassignment that
            // did win the race is reactivated here.
            //
            // The residual window is a *first-ever* opening balance for a pair
            // that has a live assignment but no Stock row yet: there is nothing
            // for either side to lock before the row exists, so a concurrent
            // unassignment can still soft-delete the assignment as this call
            // creates the first row. #569 explicitly scoped that out
            // ("enforcing assortment against inbound entries is ... a
            // consuming-workflow concern (#570–#574)"), and closing sub-
            // transaction races across the Inventory domain is #572's contract
            // (see ReceiptService::assertActorMayUseDestination) — a shared
            // pre-Stock advisory lock spanning this path and the unassign
            // controller is that issue's call, not a change to slip in here.
            $this->assignmentEnsurer->ensure($location->id, $variant->id);

            return $movement->fresh(['lines', 'toLocation', 'itemVariant.item']);
        });
    }

    /**
     * Normalize an opening-balance payload to base UOM without posting anything —
     * the exact conversion + cost math `registerOpeningBalance()` uses, so the
     * Existencias form's pre-submit preview matches what the ledger will record.
     *
     * @return array{
     *     entry_quantity: float,
     *     entry_uom: string,
     *     base_quantity: float,
     *     base_uom: string,
     *     conversion_applies: bool,
     *     conversion_factor: float,
     *     entry_unit_cost: float|null,
     *     base_unit_cost: float|null,
     *     total_value: float|null,
     * }
     *
     * @throws ValidationException when the destination Location is inactive, or no
     *                             UOM conversion path exists to the Variant's base UOM
     */
    public function previewOpeningBalance(RegisterOpeningBalanceData $data): array
    {
        // Mirror the posting path's active-destination check (#570): the shared
        // FormRequest only validates existence + Operating Unit access, so
        // without this the preview would 200 for an inactive Location while
        // registerOpeningBalance() 422s the identical payload.
        $this->assertDestinationActive(
            InventoryLocation::query()->whereKey($data->inventoryLocationId)->firstOrFail()
        );

        $variant = ItemVariant::with(['item', 'unitOfMeasure'])->findOrFail($data->itemVariantId);
        $entryUom = UnitOfMeasure::findOrFail($data->entryUomId);

        [$baseQuantity, $conversionFactor] = $this->convertOrFailValidation($data, $variant, $entryUom);
        $baseCost = $this->calculateBaseCost($data->unitCost, $conversionFactor);

        return [
            'entry_quantity' => $data->quantity,
            'entry_uom' => $entryUom->code,
            'base_quantity' => $baseQuantity,
            'base_uom' => $variant->unitOfMeasure->code,
            'conversion_applies' => $data->entryUomId !== $variant->uom_id,
            'conversion_factor' => $conversionFactor,
            'entry_unit_cost' => $data->unitCost,
            'base_unit_cost' => $baseCost,
            'total_value' => $baseCost === null ? null : $baseQuantity * $baseCost,
        ];
    }

    /**
     * A destination that exists and is accessible but is no longer active
     * cannot receive an Opening Balance — 422 on `inventory_location_id`, the
     * same field/message the FormRequest uses for its own destination checks
     * (#570). Shared by the posting path (under a row lock) and the preview.
     *
     * @throws ValidationException
     */
    private function assertDestinationActive(InventoryLocation $location): void
    {
        if (! $location->is_active) {
            throw ValidationException::withMessages([
                'inventory_location_id' => self::INACTIVE_DESTINATION_MESSAGE,
            ]);
        }
    }

    /**
     * Convert to base UOM, surfacing a missing conversion path as a 422 on
     * `uom_id` instead of an unmapped 500-class exception (#570) — an operator
     * picked an entry UOM the catalog has no route from, which is bad input.
     *
     * The base quantity is snapped to the ledger's storage precision
     * (`stock_movements.qty` / `stock_movement_lines.base_qty` are
     * `decimal(15,4)`) and rejected with a 422 on `quantity` when it rounds to
     * zero — e.g. `0.01 GR` at a `0.001` GR→KG factor is `0.00001 KG`, which the
     * FormRequest's entry-unit `gt:0` lets through but the DB's `qty > 0` CHECK
     * would reject as an uncaught 500. Preview and posting share this, so the
     * previewed base quantity is exactly what the ledger records.
     *
     * @return array{0: float, 1: float}
     *
     * @throws ValidationException
     */
    private function convertOrFailValidation(RegisterOpeningBalanceData $data, ItemVariant $variant, UnitOfMeasure $entryUom): array
    {
        try {
            [$baseQuantity, $conversionFactor] = $this->convertToBaseQuantity(
                $data->quantity, $data->entryUomId, $variant, $entryUom
            );
        } catch (UomConversionNotFoundException $e) {
            throw ValidationException::withMessages(['uom_id' => $e->getMessage()]);
        }

        $baseQuantity = round($baseQuantity, self::BASE_QUANTITY_SCALE);

        if ($baseQuantity <= 0) {
            throw ValidationException::withMessages([
                'quantity' => "The quantity converts to zero in {$variant->unitOfMeasure->code}, the item's base unit, and cannot be recorded.",
            ]);
        }

        return [$baseQuantity, $conversionFactor];
    }

    /**
     * Convert an entry-UOM unit cost to base UOM.
     */
    private function calculateBaseCost(?float $unitCost, float $conversionFactor): ?float
    {
        if ($unitCost === null) {
            return null;
        }

        return $conversionFactor != 0 ? $unitCost / $conversionFactor : 0;
    }
}
