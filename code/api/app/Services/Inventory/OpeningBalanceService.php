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

            if (! $location->is_active) {
                throw ValidationException::withMessages([
                    'inventory_location_id' => 'The selected location is inactive and cannot receive an opening balance.',
                ]);
            }

            if ($data->userId !== null) {
                $this->scope->assertCanAccessLocation(User::findOrFail($data->userId), $location);
            }

            $variant = ItemVariant::with(['item', 'unitOfMeasure'])->findOrFail($data->itemVariantId);
            $entryUom = UnitOfMeasure::findOrFail($data->entryUomId);

            [$baseQuantity, $conversionFactor] = $this->convertOrFailValidation($data, $variant, $entryUom);
            $baseCost = $this->calculateBaseCost($data->unitCost, $conversionFactor);

            // Initialization establishes the managed-assortment assignment for
            // the pair (#569) in the same transaction as the entry, so an
            // opened balance is always discoverable in the Location's assignment
            // list — never a Stock row with no assignment behind it. Whether it
            // was newly created or already live doesn't change the posting.
            $this->assignmentEnsurer->ensure($location->id, $variant->id);

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
                    lineTotal: $baseCost ? $baseQuantity * $baseCost : null,
                ),
            ));

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
     * @throws ValidationException when no UOM conversion path exists to the Variant's base UOM
     */
    public function previewOpeningBalance(RegisterOpeningBalanceData $data): array
    {
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
     * Convert to base UOM, surfacing a missing conversion path as a 422 on
     * `uom_id` instead of an unmapped 500-class exception (#570) — an operator
     * picked an entry UOM the catalog has no route from, which is bad input.
     *
     * @return array{0: float, 1: float}
     *
     * @throws ValidationException
     */
    private function convertOrFailValidation(RegisterOpeningBalanceData $data, ItemVariant $variant, UnitOfMeasure $entryUom): array
    {
        try {
            return $this->convertToBaseQuantity($data->quantity, $data->entryUomId, $variant, $entryUom);
        } catch (UomConversionNotFoundException $e) {
            throw ValidationException::withMessages(['uom_id' => $e->getMessage()]);
        }
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
