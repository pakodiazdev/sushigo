<?php

namespace App\Services\Inventory;

use App\DataTransferObjects\Inventory\RegisterStockOutData;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\InvalidStockOutReasonException;
use App\Exceptions\StockNotFoundException;
use App\Exceptions\UomConversionNotFoundException;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Models\UnitOfMeasure;
use App\Services\Inventory\Concerns\ConvertsUomQuantities;
use App\Support\Clock\ApplicationClock;
use Illuminate\Support\Facades\DB;

class StockOutService
{
    use ConvertsUomQuantities;

    public function __construct(
        private readonly ApplicationClock $clock,
        private readonly StockMutationService $stockMutation,
    ) {}

    /**
     * Register a stock outbound movement (SALE or CONSUMPTION)
     *
     * @throws InvalidStockOutReasonException
     * @throws UomConversionNotFoundException
     * @throws StockNotFoundException
     * @throws InsufficientStockException
     */
    public function registerStockOut(RegisterStockOutData $data): StockMovement
    {
        $inventoryLocationId = $data->inventoryLocationId;
        $itemVariantId = $data->itemVariantId;
        $quantity = $data->quantity;
        $transactionUomId = $data->transactionUomId;
        $reason = $data->reason;
        $salePrice = $data->salePrice;
        $userId = $data->userId;
        $reference = $data->reference;
        $notes = $data->notes;

        // Validate reason
        if (! in_array($reason, [StockMovement::REASON_SALE, StockMovement::REASON_CONSUMPTION])) {
            throw new InvalidStockOutReasonException("Invalid reason for stock out: {$reason}. Must be SALE or CONSUMPTION.");
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
            [$baseQuantity, $conversionFactor] = $this->convertToBaseQuantity($quantity, $transactionUomId, $variant, $transactionUom);

            // Check stock availability
            $stock = $this->assertAvailableStock($inventoryLocationId, $itemVariantId, $baseQuantity, $variant, $location);

            // Cost this location's outbound movement at that same location's
            // weighted-average cost (#434). The per-Variant avg_unit_cost
            // column was never location-specific and was dropped in #442.
            $unitCost = (float) ($stock->weighted_avg_cost ?? 0);

            // Calculate pricing and profit (only for SALE movements)
            [$saleTotal, $profitMargin, $profitTotal] = $this->calculateSaleFigures(
                $reason,
                $salePrice,
                $quantity,
                $baseQuantity,
                $conversionFactor,
                $unitCost
            );

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
                'posted_at' => $this->clock->nowUtc(),
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

            // Decrement stock (guarded against a negative result — see StockMutationService)
            $this->stockMutation->decreaseOnHand($stock, $baseQuantity);

            return $movement->fresh(['lines', 'fromLocation', 'itemVariant.item', 'itemVariant.unitOfMeasure']);
        });
    }

    /**
     * Assert the location has enough available stock for the requested base quantity.
     *
     * @throws StockNotFoundException
     * @throws InsufficientStockException
     */
    private function assertAvailableStock(int $inventoryLocationId, int $itemVariantId, float $baseQuantity, ItemVariant $variant, InventoryLocation $location): Stock
    {
        // Locked for the remainder of this transaction — a second concurrent
        // stock-out on the same row blocks here until this one commits or
        // rolls back, instead of reading a stale on_hand and overselling.
        $stock = $this->stockMutation->lockAndGet($inventoryLocationId, $itemVariantId);

        if (! $stock) {
            throw new StockNotFoundException(
                "No stock found for variant {$variant->sku} at location {$location->name}"
            );
        }

        $availableQty = $stock->on_hand - $stock->reserved;
        if ($baseQuantity > $availableQty) {
            throw new InsufficientStockException(
                "Insufficient stock. Available: {$availableQty}, Requested: {$baseQuantity}"
            );
        }

        return $stock;
    }

    /**
     * Calculate sale total and profit figures for SALE movements, returning [saleTotal, profitMargin, profitTotal].
     */
    private function calculateSaleFigures(string $reason, ?float $salePrice, float $quantity, float $baseQuantity, float $conversionFactor, float $unitCost): array
    {
        if ($reason !== StockMovement::REASON_SALE || $salePrice === null) {
            return [null, null, null];
        }

        $saleTotal = $quantity * $salePrice;
        $salePriceBase = $conversionFactor != 0 ? $salePrice / $conversionFactor : 0;
        $profitMargin = $salePriceBase - $unitCost;
        $profitTotal = $baseQuantity * $profitMargin;

        return [$saleTotal, $profitMargin, $profitTotal];
    }
}
