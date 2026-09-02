<?php

namespace App\Services\Inventory;

use App\DataTransferObjects\Inventory\InventoryEntryLineData;
use App\DataTransferObjects\Inventory\InventoryEntryPostingData;
use App\DataTransferObjects\Inventory\RegisterOpeningBalanceData;
use App\Exceptions\UomConversionNotFoundException;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\StockMovement;
use App\Models\UnitOfMeasure;
use App\Services\Inventory\Concerns\ConvertsUomQuantities;
use App\Support\Clock\ApplicationClock;
use Illuminate\Support\Facades\DB;

class OpeningBalanceService
{
    use ConvertsUomQuantities;

    public function __construct(
        private readonly ApplicationClock $clock,
        private readonly InventoryEntryPostingService $entryPosting,
    ) {}

    /**
     * Register opening balance for an item variant at a specific location
     *
     * @throws UomConversionNotFoundException
     */
    public function registerOpeningBalance(RegisterOpeningBalanceData $data): StockMovement
    {
        $inventoryLocationId = $data->inventoryLocationId;
        $itemVariantId = $data->itemVariantId;
        $quantity = $data->quantity;
        $entryUomId = $data->entryUomId;
        $unitCost = $data->unitCost;
        $userId = $data->userId;
        $reference = $data->reference;
        $notes = $data->notes;

        return DB::transaction(function () use (
            $inventoryLocationId,
            $itemVariantId,
            $quantity,
            $entryUomId,
            $unitCost,
            $userId,
            $reference,
            $notes
        ) {
            // Validate location
            InventoryLocation::findOrFail($inventoryLocationId);

            // Validate variant
            $variant = ItemVariant::with(['item', 'unitOfMeasure'])->findOrFail($itemVariantId);

            // Validate entry UOM
            $entryUom = UnitOfMeasure::findOrFail($entryUomId);

            // Convert quantity to base UOM
            [$baseQuantity, $conversionFactor] = $this->convertToBaseQuantity($quantity, $entryUomId, $variant, $entryUom);

            // Calculate unit cost in base UOM
            $baseCost = $this->calculateBaseCost($unitCost, $conversionFactor);

            // One posting primitive writes the immutable movement + line,
            // race-safely creates/increments Stock, and blends the
            // weighted-average cost (#567). An Opening Balance has no source
            // document, so it carries no source-line identity — it stays a
            // manual entry with no idempotency contract. A null cost skips the
            // blend; an explicit 0 still blends (e.g. free stock).
            $movement = $this->entryPosting->post(new InventoryEntryPostingData(
                inventoryLocationId: $inventoryLocationId,
                itemVariantId: $itemVariantId,
                baseQuantity: $baseQuantity,
                reason: StockMovement::REASON_OPENING_BALANCE,
                userId: $userId,
                unitCost: $baseCost,
                reference: $reference,
                notes: $notes,
                movementMeta: [
                    'original_qty' => $quantity,
                    'original_uom' => $entryUom->code,
                    'original_uom_id' => $entryUomId,
                    'conversion_factor' => $conversionFactor,
                    'unit_cost' => $unitCost,
                    'base_cost' => $baseCost,
                ],
                postedAt: $this->clock->nowUtc(),
                line: new InventoryEntryLineData(
                    uomId: $entryUomId,
                    qty: $quantity,
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
