<?php

namespace App\Services\Inventory;

use App\DataTransferObjects\Inventory\RegisterOpeningBalanceData;
use App\Exceptions\UomConversionNotFoundException;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Models\UnitOfMeasure;
use App\Services\Inventory\Concerns\ConvertsUomQuantities;
use App\Support\Clock\ApplicationClock;
use Illuminate\Support\Facades\DB;

class OpeningBalanceService
{
    use ConvertsUomQuantities;

    public function __construct(
        private readonly ApplicationClock $clock,
        private readonly StockMutationService $stockMutation,
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

            // Create stock movement
            $movement = StockMovement::create([
                'from_location_id' => null,
                'to_location_id' => $inventoryLocationId,
                'item_variant_id' => $itemVariantId,
                'user_id' => $userId,
                'qty' => $baseQuantity,
                'reason' => StockMovement::REASON_OPENING_BALANCE,
                'status' => StockMovement::STATUS_POSTED,
                'reference' => $reference,
                'notes' => $notes,
                'meta' => [
                    'original_qty' => $quantity,
                    'original_uom' => $entryUom->code,
                    'original_uom_id' => $entryUomId,
                    'conversion_factor' => $conversionFactor,
                    'unit_cost' => $unitCost,
                    'base_cost' => $baseCost,
                ],
                'posted_at' => $this->clock->nowUtc(),
            ]);

            // Create movement line
            StockMovementLine::create([
                'stock_movement_id' => $movement->id,
                'item_variant_id' => $itemVariantId,
                'uom_id' => $entryUomId,
                'qty' => $quantity,
                'base_qty' => $baseQuantity,
                'conversion_factor' => $conversionFactor,
                'unit_cost' => $baseCost,
                'line_total' => $baseCost ? $baseQuantity * $baseCost : null,
                'meta' => [],
            ]);

            // Update or create stock record — race-safe against a concurrent
            // first receipt for the same location+variant (see StockMutationService)
            $stock = $this->stockMutation->receiveInto($inventoryLocationId, $itemVariantId, $baseQuantity);

            // Blend into this location's weighted-average cost (#434) —
            // never onto ItemVariant.avg_unit_cost/last_unit_cost, which
            // this diverged from before #434 unified the two. The Product/
            // Variant catalog stays read-only for acquisition cost; Stock
            // (per Inventory Location) is the single source of truth.
            // An explicit 0 must still blend (e.g. free stock) — only a
            // missing (null) cost means "no cost supplied," matching
            // ReceiptService's unconditional blend on every line.
            if ($baseCost !== null) {
                $stock->applyWeightedAverageCost($baseQuantity, $baseCost);
            }

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
