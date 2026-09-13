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

    /** Maximum positive value representable by the Stock decimal(15,4) quantities. */
    public const MAX_STORED_QUANTITY = 99_999_999_999.9999;

    protected $table = 'stock';

    protected $fillable = [
        'inventory_location_id',
        'item_variant_id',
        'on_hand',
        'reserved',
        'weighted_avg_cost',
        'total_value',
        'meta',
    ];

    protected $casts = [
        'on_hand' => 'decimal:4',
        'reserved' => 'decimal:4',
        'available' => 'decimal:4',
        'weighted_avg_cost' => 'decimal:4',
        'total_value' => 'decimal:4',
        'meta' => 'array',
    ];

    // available is a computed column in the database

    protected static function booted(): void
    {
        // #579: a caller creating a Stock row directly (seeders, factories,
        // tests, or a future writer) with an explicit `weighted_avg_cost` but
        // no `total_value` would otherwise leave the new accumulator at its
        // column default (0) — inconsistent with on_hand * weighted_avg_cost
        // from the first write, and rejected outright by the
        // stock_total_value_nonnegative check constraint the moment anything
        // (e.g. a Transfer moving stock out) tries to decrement it below
        // zero. Every writer that goes through applyWeightedAverageCost() /
        // reverseWeightedAverageCost() / decreaseOnHand() already sets
        // total_value explicitly and is unaffected by this default.
        //
        // On `saving`, not `creating`: HasPublicId's own `creating` listener
        // returns a truthy value (the assigned public_id), which halts that
        // halting-by-default event before a second listener would run — the
        // same gotcha StockMovementLine::booted() documents. `! $stock->exists`
        // limits this to the insert path, mirroring that same pattern.
        static::saving(function (self $stock) {
            if (! $stock->exists && ! array_key_exists('total_value', $stock->getAttributes())) {
                // bcmath (via addValue()'s own exact multiplication), not a
                // raw float product: on_hand/weighted_avg_cost can each carry
                // up to 11 integer digits, and PHP float64 only holds ~15-17
                // significant digits — a raw `(float) $a * (float) $b` at that
                // magnitude silently loses precision (and can round to
                // exactly the decimal(26,4) ceiling, tripping a spurious
                // overflow on an otherwise-representable value).
                $stock->total_value = WeightedAverageCostCalculator::addValue(
                    priorTotalValue: 0.0,
                    addedQty: (float) $stock->on_hand,
                    addedUnitCost: (float) $stock->weighted_avg_cost,
                );
            }
        });
    }

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
     * Scope to stock rows that are "low" against the resolved per-location
     * replenishment policy (#439): a live policy must exist for this row's
     * (location, variant) pair and `on_hand` must sit at or below its
     * `min_stock`. Rows with no policy are never low — nothing was configured
     * to compare them against.
     */
    public function scopeLowStock($query)
    {
        return $query->whereExists(function ($sub) {
            $sub->selectRaw('1')
                ->from('variant_location_replenishment_policies as vlrp')
                ->whereColumn('vlrp.item_variant_id', 'stock.item_variant_id')
                ->whereColumn('vlrp.inventory_location_id', 'stock.inventory_location_id')
                ->whereNull('vlrp.deleted_at')
                ->whereColumn('stock.on_hand', '<=', 'vlrp.min_stock');
        });
    }

    /**
     * Increase on_hand quantity
     *
     * @throws InvalidStockBalanceException if $qty is not positive or the accumulated balance would overflow
     */
    public function increaseOnHand(float $qty): void
    {
        $this->assertPositiveQuantity($qty);

        // Snap the sum to the column's own decimal(15,4) scale before the
        // boundary check: a raw binary-float addition of two decimal(15,4)
        // values can land a fraction of a ULP above MAX_STORED_QUANTITY near
        // the ceiling and reject a balance the column would store exactly
        // (e.g. 99999999999.9998 + 0.0001).
        $resultingOnHand = round((float) $this->on_hand + $qty, 4);

        if (! is_finite($resultingOnHand) || $resultingOnHand > self::MAX_STORED_QUANTITY) {
            throw new InvalidStockBalanceException(
                "Cannot increase on_hand beyond decimal(15,4) for stock #{$this->id}. Current: {$this->on_hand}, Requested: {$qty}"
            );
        }

        $this->increment('on_hand', $qty);
    }

    /**
     * Decrease on_hand quantity
     *
     * @throws InvalidStockBalanceException if $qty is not positive, or the result would be negative or leave on_hand below reserved
     */
    public function decreaseOnHand(float $qty): void
    {
        $resultingOnHand = $this->assertDecreaseIsWithinBounds($qty);

        // #579: keep the exact value accumulator in lockstep with every
        // quantity-only decrease (consumption, transfer-out, a generic
        // movement reversal) — removed at the *current* average, since none
        // of these callers ever change the average itself
        // (applyWeightedAverageCost() and reverseWeightedAverageCost() are
        // the only writers of weighted_avg_cost). This is what keeps
        // total_value exactly reconcilable without every outbound caller
        // having to maintain it itself.
        //
        // weighted_avg_cost is a *rounded* scale-4 rate while total_value is
        // exact, so qty * weighted_avg_cost can exceed what's actually left
        // — most visibly on a full depletion (qty === on_hand), where the
        // rounded rate times the full quantity does not necessarily equal
        // the exact accumulator. Clamping to what remains guarantees this
        // never drives total_value negative and trips the
        // stock_total_value_nonnegative constraint; the (negligible, at most
        // half a cent per unit) difference is absorbed as a rounding
        // write-off, the same accepted approximation this codebase already
        // makes by leaving weighted_avg_cost untouched on a plain decrease.
        $valueRemoved = min(round($qty * (float) $this->weighted_avg_cost, 4), (float) $this->total_value);

        $this->update([
            'on_hand' => $resultingOnHand,
            'total_value' => round((float) $this->total_value - $valueRemoved, 4),
        ]);
    }

    /**
     * Shared on_hand/reserved boundary guard for decreaseOnHand() and
     * reverseWeightedAverageCost() — both decrease on_hand by the same rules,
     * they only differ in how they account for value afterward.
     *
     * @return float the resulting on_hand, if within bounds
     *
     * @throws InvalidStockBalanceException if $qty is not positive, or the result would be negative or leave on_hand below reserved
     */
    private function assertDecreaseIsWithinBounds(float $qty): float
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

        return $resultingOnHand;
    }

    /**
     * Blend a newly received quantity+cost into this location's
     * weighted-average acquisition cost (#434) — the single writer every
     * cost-bearing inbound flow (Receipts, Opening Balance) must call
     * instead of re-deriving the formula itself. `on_hand` must already
     * reflect $qtyAdded (i.e. call this after incrementing on_hand, not
     * before).
     *
     * Maintains `total_value` (#579) — the exact running value accumulator
     * kept alongside the rounded, display-only `weighted_avg_cost` — purely
     * additively via `addValue()`, then derives `weighted_avg_cost` fresh
     * from that exact accumulator via `averageCost()`. This deliberately
     * does **not** use `WeightedAverageCostCalculator::blend()` (which takes
     * the *rounded* prior average as an input): reconstructing from a
     * rounded prior average compounds a fresh rounding error into every
     * subsequent receipt the same way it did for reversal (see
     * `subtractValue()`'s docblock) — e.g. two batches of 10,000 units each
     * (@0.0001 then @0.0002) round the stored average to 0.0002, and
     * blending a third batch (10,000 @0.0001) from that rounded 0.0002
     * lands on 0.0002 again, while the true value/quantity ratio
     * (4.0000 / 30,000) rounds to 0.0001. Deriving from the exact
     * accumulator every time keeps `weighted_avg_cost` always exactly
     * `averageCost(total_value, on_hand)`, never a compounded approximation.
     */
    public function applyWeightedAverageCost(float $qtyAdded, float $unitCost): void
    {
        if ($qtyAdded <= 0) {
            return;
        }

        $newTotalValue = WeightedAverageCostCalculator::addValue((float) $this->total_value, $qtyAdded, $unitCost);

        $this->update([
            'total_value' => $newTotalValue,
            'weighted_avg_cost' => WeightedAverageCostCalculator::averageCost($newTotalValue, (float) $this->on_hand),
        ]);
    }

    /**
     * Reverse a previously-applied weighted-average cost contribution and its
     * matching quantity in one atomic step (#579) — the reversal counterpart
     * to applyWeightedAverageCost(): where that method blends a newly added
     * quantity+cost in, this one removes a previously added quantity+cost
     * back out of the exact `total_value` accumulator, using the *exact*
     * immutable unit cost the original posting recorded (from the posted
     * movement's own line evidence), never a re-derived approximation.
     *
     * Deliberately does not delegate to decreaseOnHand(): that method removes
     * value at the *current* average (correct for consumption/transfer-out,
     * which never change the average), whereas a reversal must remove the
     * *original* evidenced value, which can differ from the current average
     * once other receipts have blended in. See
     * WeightedAverageCostCalculator::subtractValue() for why this reads
     * `total_value` directly instead of reconstructing prior value from the
     * rounded `weighted_avg_cost` column, and for exactly which conditions
     * cannot be reconciled without approximating.
     *
     * @throws InvalidStockBalanceException if $qtyRemoved is not positive, if it would drive on_hand
     *                                      negative or below reserved, or if the value this quantity originally contributed can no
     *                                      longer be exactly attributed to what remains
     */
    public function reverseWeightedAverageCost(float $qtyRemoved, float $originalUnitCost): void
    {
        $resultingOnHand = $this->assertDecreaseIsWithinBounds($qtyRemoved);

        $newTotalValue = WeightedAverageCostCalculator::subtractValue(
            priorTotalValue: (float) $this->total_value,
            remainingQty: $resultingOnHand,
            removedQty: $qtyRemoved,
            removedUnitCost: $originalUnitCost,
        );

        if ($newTotalValue === null) {
            throw new InvalidStockBalanceException(
                "Cannot reconcile weighted-average cost for stock #{$this->id}: removing {$qtyRemoved} units "
                ."originally received at {$originalUnitCost} would leave unexplained residual inventory value."
            );
        }

        $this->update([
            'on_hand' => $resultingOnHand,
            'total_value' => $newTotalValue,
            'weighted_avg_cost' => WeightedAverageCostCalculator::averageCost($newTotalValue, $resultingOnHand),
        ]);
    }

    /**
     * Restore value for a quantity being added back at this row's *current*
     * weighted-average cost, without changing the average itself (#579) —
     * the counterpart to decreaseOnHand()'s automatic value removal, for a
     * plain quantity restore that is not itself a new cost-bearing receipt
     * (e.g. StockMovementReverser undoing a Transfer's source-side decrease,
     * where — like the rest of Transfer reversal — the average is
     * intentionally left untouched; see inventory-architecture.en.md
     * §3.9). Keeps `total_value` exactly reconciled through that path too,
     * instead of only through applyWeightedAverageCost()/decreaseOnHand().
     */
    public function restoreValueAtCurrentAverage(float $qtyRestored): void
    {
        if ($qtyRestored <= 0) {
            return;
        }

        $valueRestored = round($qtyRestored * (float) $this->weighted_avg_cost, 4);

        $this->increment('total_value', $valueRestored);
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
