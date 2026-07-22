<?php

namespace App\Services\Inventory;

use App\DataTransferObjects\Inventory\RegisterOpeningBalanceData;
use App\Exceptions\UomConversionNotFoundException;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Models\UnitOfMeasure;
use App\Models\UomConversion;
use Illuminate\Support\Facades\DB;

class OpeningBalanceService
{
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
                'posted_at' => now(),
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

            // Update or create stock record
            $this->upsertStock($inventoryLocationId, $itemVariantId, $baseQuantity);

            // Update variant costing if cost provided
            if ($baseCost !== null && $baseCost > 0) {
                $this->updateVariantCosting($variant, $baseQuantity, $baseCost);
            }

            return $movement->fresh(['lines', 'toLocation', 'itemVariant.item']);
        });
    }

    /**
     * Get conversion between two UOMs (searches in both directions)
     */
    protected function getConversion(int $fromUomId, int $toUomId): ?UomConversion
    {
        // Try direct conversion first
        $conversion = UomConversion::where('from_uom_id', $fromUomId)
            ->where('to_uom_id', $toUomId)
            ->where('is_active', true)
            ->first();

        if ($conversion) {
            return $conversion;
        }

        // Try inverse conversion
        $inverseConversion = UomConversion::where('from_uom_id', $toUomId)
            ->where('to_uom_id', $fromUomId)
            ->where('is_active', true)
            ->first();

        if ($inverseConversion) {
            // Create a virtual conversion with inverted factor
            $virtual = new UomConversion;
            $virtual->from_uom_id = $fromUomId;
            $virtual->to_uom_id = $toUomId;
            $virtual->factor = 1 / $inverseConversion->factor;
            $virtual->tolerance_percent = $inverseConversion->tolerance_percent;
            $virtual->is_active = true;

            return $virtual;
        }

        return null;
    }

    /**
     * Update variant costing with weighted average
     */
    protected function updateVariantCosting(ItemVariant $variant, float $newQty, float $newCost): void
    {
        $currentQty = $variant->stock()->sum('on_hand');
        $currentAvg = $variant->avg_unit_cost;

        // Calculate previous quantity (before this movement)
        $previousQty = max(0, $currentQty - $newQty);

        // Calculate new weighted average
        if ($previousQty + $newQty > 0) {
            $newAvg = (($previousQty * $currentAvg) + ($newQty * $newCost)) / ($previousQty + $newQty);
        } else {
            $newAvg = $newCost;
        }

        $variant->update([
            'last_unit_cost' => $newCost,
            'avg_unit_cost' => $newAvg,
        ]);
    }

    /**
     * Convert an entry-UOM quantity to base UOM, returning [baseQuantity, conversionFactor].
     *
     * @throws UomConversionNotFoundException
     */
    private function convertToBaseQuantity(float $quantity, int $entryUomId, ItemVariant $variant, UnitOfMeasure $entryUom): array
    {
        if ($entryUomId === $variant->uom_id) {
            return [$quantity, 1.0];
        }

        $conversion = $this->getConversion($entryUomId, $variant->uom_id);
        if (! $conversion) {
            throw new UomConversionNotFoundException(
                "No conversion found from {$entryUom->code} to {$variant->unitOfMeasure->code}"
            );
        }

        return [$quantity * $conversion->factor, $conversion->factor];
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

    /**
     * Increment on-hand quantity for an existing stock record, or create one.
     */
    private function upsertStock(int $inventoryLocationId, int $itemVariantId, float $baseQuantity): Stock
    {
        $stock = Stock::where('inventory_location_id', $inventoryLocationId)
            ->where('item_variant_id', $itemVariantId)
            ->first();

        if ($stock) {
            $stock->increment('on_hand', $baseQuantity);

            return $stock;
        }

        return Stock::create([
            'inventory_location_id' => $inventoryLocationId,
            'item_variant_id' => $itemVariantId,
            'on_hand' => $baseQuantity,
            'reserved' => 0,
            'meta' => [],
        ]);
    }
}
