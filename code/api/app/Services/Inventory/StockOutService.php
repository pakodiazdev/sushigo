<?php

namespace App\Services\Inventory;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Models\UnitOfMeasure;
use App\Models\UomConversion;
use Illuminate\Support\Facades\DB;

class StockOutService
{
    /**
     * Register a stock outbound movement (SALE or CONSUMPTION)
     *
     * @param int $inventoryLocationId The inventory location ID (from location)
     * @param int $itemVariantId The item variant ID
     * @param float $quantity Quantity in transaction UOM
     * @param int $transactionUomId Unit of measure for the transaction
     * @param string $reason Movement reason (SALE or CONSUMPTION)
     * @param float|null $salePrice Sale price per unit in transaction UOM (optional, for SALE movements)
     * @param int|null $userId User performing the operation
     * @param string|null $reference External reference number
     * @param string|null $notes Additional notes
     * @return StockMovement
     * @throws \Exception
     */
    public function registerStockOut(
        int $inventoryLocationId,
        int $itemVariantId,
        float $quantity,
        int $transactionUomId,
        string $reason,
        ?float $salePrice = null,
        ?int $userId = null,
        ?string $reference = null,
        ?string $notes = null
    ): StockMovement {
        // Validate reason
        if (!in_array($reason, [StockMovement::REASON_SALE, StockMovement::REASON_CONSUMPTION])) {
            throw new \Exception("Invalid reason for stock out: {$reason}. Must be SALE or CONSUMPTION.");
        }

        return DB::transaction(function () use (
            $inventoryLocationId,
            $itemVariantId,
            $quantity,
            $transactionUomId,
            $reason,
            $salePrice,
            $userId,
            $reference,
            $notes
        ) {
            // Validate location
            $location = InventoryLocation::findOrFail($inventoryLocationId);
            
            // Validate variant with item and UOM
            $variant = ItemVariant::with(['item', 'unitOfMeasure'])->findOrFail($itemVariantId);
            
            // Validate transaction UOM
            $transactionUom = UnitOfMeasure::findOrFail($transactionUomId);
            
            // Convert quantity to base UOM
            $conversionFactor = 1.0;
            $baseQuantity = $quantity;
            
            if ($transactionUomId !== $variant->uom_id) {
                $conversion = $this->getConversion($transactionUomId, $variant->uom_id);
                if (!$conversion) {
                    throw new \Exception(
                        "No conversion found from {$transactionUom->code} to {$variant->unitOfMeasure->code}"
                    );
                }
                $conversionFactor = $conversion->factor;
                $baseQuantity = $quantity * $conversionFactor;
            }
            
            // Check stock availability
            $stock = Stock::where('inventory_location_id', $inventoryLocationId)
                ->where('item_variant_id', $itemVariantId)
                ->first();
                
            if (!$stock) {
                throw new \Exception(
                    "No stock found for variant {$variant->sku} at location {$location->name}"
                );
            }
            
            $availableQty = $stock->on_hand - $stock->reserved;
            if ($baseQuantity > $availableQty) {
                throw new \Exception(
                    "Insufficient stock. Available: {$availableQty}, Requested: {$baseQuantity}"
                );
            }
            
            // Get current average unit cost from variant
            $unitCost = $variant->avg_unit_cost ?? 0;
            
            // Calculate pricing and profit (only for SALE movements)
            $saleTotal = null;
            $profitMargin = null;
            $profitTotal = null;
            
            if ($reason === StockMovement::REASON_SALE && $salePrice !== null) {
                $saleTotal = $quantity * $salePrice;
                
                // Convert sale price to base UOM for profit calculation
                $salePriceBase = $conversionFactor != 0 ? $salePrice / $conversionFactor : 0;
                $profitMargin = $salePriceBase - $unitCost;
                $profitTotal = $baseQuantity * $profitMargin;
            }
            
            // Create stock movement
            $movement = StockMovement::create([
                'from_location_id' => $inventoryLocationId,
                'to_location_id' => null, // Outbound movement has no destination
                'item_variant_id' => $itemVariantId,
                'user_id' => $userId,
                'qty' => $baseQuantity,
                'reason' => $reason,
                'status' => StockMovement::STATUS_POSTED,
                'reference' => $reference,
                'notes' => $notes,
                'meta' => [
                    'original_qty' => $quantity,
                    'original_uom' => $transactionUom->code,
                    'original_uom_id' => $transactionUomId,
                    'conversion_factor' => $conversionFactor,
                    'unit_cost' => $unitCost,
                    'sale_price' => $salePrice,
                    'profit_margin' => $profitMargin,
                ],
                'posted_at' => now(),
            ]);
            
            // Create movement line
            StockMovementLine::create([
                'stock_movement_id' => $movement->id,
                'item_variant_id' => $itemVariantId,
                'uom_id' => $transactionUomId,
                'qty' => $quantity,
                'base_qty' => $baseQuantity,
                'conversion_factor' => $conversionFactor,
                'unit_cost' => $unitCost,
                'line_total' => $baseQuantity * $unitCost,
                'sale_price' => $salePrice,
                'sale_total' => $saleTotal,
                'profit_margin' => $profitMargin,
                'profit_total' => $profitTotal,
                'meta' => [],
            ]);
            
            // Decrement stock
            $stock->decrement('on_hand', $baseQuantity);
            
            return $movement->fresh(['lines', 'fromLocation', 'itemVariant.item', 'itemVariant.unitOfMeasure']);
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
            $virtual = new UomConversion();
            $virtual->from_uom_id = $fromUomId;
            $virtual->to_uom_id = $toUomId;
            $virtual->factor = 1 / $inverseConversion->factor;
            $virtual->tolerance_percent = $inverseConversion->tolerance_percent;
            $virtual->is_active = true;
            
            return $virtual;
        }
        
        return null;
    }
}
