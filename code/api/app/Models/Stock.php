<?php

namespace App\Models;

use App\Exceptions\InvalidStockBalanceException;
use App\Support\Money\WeightedAverageCostCalculator;
use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stock extends Model
{
    use HasPublicId, SerializesPublicIdAsId;

    protected $table = 'stock';

    protected $fillable = [
        'inventory_location_id',
        'item_variant_id',
        'on_hand',
        'reserved',
        'weighted_avg_cost',
        'meta',
    ];

    protected $casts = [
        'on_hand' => 'decimal:4',
        'reserved' => 'decimal:4',
        'available' => 'decimal:4',
        'weighted_avg_cost' => 'decimal:4',
        'meta' => 'array',
    ];

    // available is a computed column in the database

    /**
     * Get the inventory location
     */
    public function inventoryLocation(): BelongsTo
    {
        return $this->belongsTo(InventoryLocation::class);
    }

    /**
     * Get the item variant
     */
    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }

    /**
     * Scope to filter positive stock
     */
    public function scopePositive($query)
    {
        return $query->where('on_hand', '>', 0);
    }

    /**
     * Scope to filter available stock
     */
    public function scopeAvailable($query)
    {
        return $query->whereRaw('on_hand > reserved');
    }

    /**
     * Increase on_hand quantity
     *
     * @throws InvalidStockBalanceException if $qty is not positive
     */
    public function increaseOnHand(float $qty): void
    {
        $this->assertPositiveQuantity($qty);

        $this->increment('on_hand', $qty);
    }

    /**
     * Decrease on_hand quantity
     *
     * @throws InvalidStockBalanceException if $qty is not positive, or the result would be negative or leave on_hand below reserved
     */
    public function decreaseOnHand(float $qty): void
    {
        $this->assertPositiveQuantity($qty);

        $resultingOnHand = (float) $this->on_hand - $qty;

        if ($resultingOnHand < 0) {
            throw new InvalidStockBalanceException(
                "Cannot decrease on_hand below zero for stock #{$this->id}. Current: {$this->on_hand}, Requested: {$qty}"
            );
        }

        if ($resultingOnHand < (float) $this->reserved) {
            throw new InvalidStockBalanceException(
                "Cannot decrease on_hand below reserved for stock #{$this->id}. Resulting on_hand: {$resultingOnHand}, Reserved: {$this->reserved}"
            );
        }

        $this->decrement('on_hand', $qty);
    }

    /**
     * Blend a newly received quantity+cost into this location's
     * weighted-average acquisition cost (#434) — the single writer every
     * cost-bearing inbound flow (Receipts, Opening Balance) must call
     * instead of re-deriving the formula itself. `on_hand` must already
     * reflect $qtyAdded (i.e. call this after incrementing on_hand, not
     * before) — the prior quantity is derived by subtracting it back out,
     * so this doubles as an idempotent read of "on_hand as of the moment
     * before this receipt" without a second locked query.
     */
    public function applyWeightedAverageCost(float $qtyAdded, float $unitCost): void
    {
        if ($qtyAdded <= 0) {
            return;
        }

        $priorOnHand = max(0.0, (float) $this->on_hand - $qtyAdded);

        $newAvg = WeightedAverageCostCalculator::blend(
            priorQty: $priorOnHand,
            priorAvgCost: (float) $this->weighted_avg_cost,
            addedQty: $qtyAdded,
            addedUnitCost: $unitCost,
        );

        $this->update(['weighted_avg_cost' => $newAvg]);
    }

    /**
     * Reserve quantity
     *
     * @throws InvalidStockBalanceException if $qty is not positive, or the result would exceed on_hand
     */
    public function reserve(float $qty): void
    {
        $this->assertPositiveQuantity($qty);

        $available = (float) $this->on_hand - (float) $this->reserved;

        if ($available < $qty) {
            throw new InvalidStockBalanceException(
                "Cannot reserve more than available for stock #{$this->id}. Available: {$available}, Requested: {$qty}"
            );
        }

        $this->increment('reserved', $qty);
    }

    /**
     * Release reserved quantity
     *
     * @throws InvalidStockBalanceException if $qty is not positive, or the result would be negative
     */
    public function release(float $qty): void
    {
        $this->assertPositiveQuantity($qty);

        if ((float) $this->reserved < $qty) {
            throw new InvalidStockBalanceException(
                "Cannot release more than reserved for stock #{$this->id}. Reserved: {$this->reserved}, Requested: {$qty}"
            );
        }

        $this->decrement('reserved', $qty);
    }

    /**
     * Reject a non-positive quantity before it can invert the intended
     * mutation (e.g. a negative $qty passed to decreaseOnHand would
     * silently increase on_hand instead of being rejected).
     *
     * @throws InvalidStockBalanceException if $qty is not positive
     */
    private function assertPositiveQuantity(float $qty): void
    {
        if ($qty <= 0) {
            throw new InvalidStockBalanceException(
                "Quantity must be positive for stock #{$this->id}. Requested: {$qty}"
            );
        }
    }

    /**
     * Check if there's enough available stock
     */
    public function hasAvailable(float $qty): bool
    {
        return $this->available >= $qty;
    }
}
