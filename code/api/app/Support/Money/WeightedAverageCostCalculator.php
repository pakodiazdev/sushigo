<?php

namespace App\Support\Money;

/**
 * Single source of the weighted-average-cost blend formula (#434) — every
 * caller that mutates a cost-bearing quantity (Receipts, Opening Balance,
 * and any future stock adjustment) must go through this instead of
 * re-deriving the formula with raw float arithmetic, which is what let the
 * former ItemVariant.avg_unit_cost (dropped in #442) and
 * Stock.weighted_avg_cost diverge in the first place.
 *
 * Uses bcmath internally so the blend itself is exact-decimal, not float —
 * PHP floats cannot represent most decimal fractions (e.g. 0.1) exactly,
 * and chaining float multiply/add/divide on money amounts silently drifts.
 * Inputs/outputs stay `float` (matching this codebase's existing
 * decimal(15,4) column + Eloquent `decimal:N` cast convention — see #432's
 * PR assumptions) since the drift this guards against happens inside the
 * blend calculation itself, not in a single float cast at the boundary.
 *
 * addValue()/subtractValue()/averageCost() (#579) maintain `Stock.total_value`
 * — an exact running value accumulator kept *alongside* the rounded
 * `weighted_avg_cost` column, additively, at every quantity-changing
 * operation (Stock::increaseOnHand()/decreaseOnHand() and this class's own
 * blend()). Reversing a Purchase Receipt reads that accumulator directly
 * instead of reconstructing "prior value" as `qty * weighted_avg_cost` —
 * the rounded column would otherwise compound a fresh rounding error into
 * every successive reversal, occasionally rejecting an exactly-reversible
 * chain with a spurious "residual value" 409 (see subtractValue()'s
 * docblock for the exact failure mode this replaced).
 */
final class WeightedAverageCostCalculator
{
    /**
     * Extra precision bcmath computes at internally, beyond the stored
     * decimal(15,4) columns' 4 places — kept until the final rounding step
     * so intermediate multiplication/division doesn't truncate early.
     */
    private const CALC_SCALE = 8;

    /**
     * Decimal places the result is rounded to, matching the
     * weighted_avg_cost column's `decimal:4` cast.
     */
    private const RESULT_SCALE = 4;

    /**
     * Blend a prior on-hand quantity/cost with a newly added quantity/cost
     * into the new weighted-average unit cost.
     *
     * A non-positive resulting total quantity (no prior stock, or a
     * defensively-negative prior quantity) has no meaningful average to
     * blend into — the added cost itself becomes the new average, exactly
     * as if this were a first receipt.
     */
    public static function blend(float $priorQty, float $priorAvgCost, float $addedQty, float $addedUnitCost): float
    {
        $priorQtyStr = self::toDecimalString($priorQty);
        $totalQty = bcadd($priorQtyStr, self::toDecimalString($addedQty), self::CALC_SCALE);

        if (bccomp($totalQty, '0', self::CALC_SCALE) <= 0 || bccomp($priorQtyStr, '0', self::CALC_SCALE) <= 0) {
            return round($addedUnitCost, self::RESULT_SCALE);
        }

        $priorValue = bcmul($priorQtyStr, self::toDecimalString($priorAvgCost), self::CALC_SCALE);
        $addedValue = bcmul(self::toDecimalString($addedQty), self::toDecimalString($addedUnitCost), self::CALC_SCALE);
        $totalValue = bcadd($priorValue, $addedValue, self::CALC_SCALE);

        return round((float) bcdiv($totalValue, $totalQty, self::CALC_SCALE), self::RESULT_SCALE);
    }

    /**
     * Tolerance, in money terms, below which a residual value is treated as a
     * rounding artifact rather than real unattributed value — half of the
     * smallest unit the `decimal(15,4)`-scale result can represent.
     */
    private const RESIDUAL_TOLERANCE = '0.00005';

    /**
     * Add a newly received quantity+cost's exact evidenced value to the
     * running value accumulator (#579) — the additive counterpart to
     * blend(), called alongside it so `Stock.total_value` never has to be
     * reconstructed from the (rounded, display-only) `weighted_avg_cost`
     * column later.
     */
    public static function addValue(float $priorTotalValue, float $addedQty, float $addedUnitCost): float
    {
        $added = bcmul(self::toDecimalString($addedQty), self::toDecimalString($addedUnitCost), self::CALC_SCALE);
        $total = bcadd(self::toDecimalString($priorTotalValue), $added, self::CALC_SCALE);

        return round((float) $total, self::RESULT_SCALE);
    }

    /**
     * Subtract a previously-added quantity+cost's exact evidenced value from
     * the running value accumulator (#579), given the resulting quantity the
     * removal leaves behind (`Stock::decreaseOnHand()`'s own on_hand/reserved
     * guard has already validated this quantity separately).
     *
     * This operates on the accumulator directly instead of reconstructing
     * "prior value" as `qty * weighted_avg_cost`: reconstructing from the
     * rounded column compounds a fresh rounding error into every successive
     * reversal. Concretely, blending 1 unit @ 0.1 with 2 units @ 0.2 stores a
     * rounded average of 0.1667; reversing the first receipt by reconstructing
     * `3 * 0.1667 - 1 * 0.1 = 0.4001` over 2 remaining units already drifts to
     * 0.2001 (not the exact 0.2), and reversing the *second* receipt next
     * would then see a 0.0002 residual on an otherwise fully-emptied balance
     * and wrongly refuse with a 409 — even though every original unit is
     * still fully accounted for. Operating on the accumulator instead keeps
     * every step exact: 0.5 - 0.1 = 0.4 - 0.4 = 0.0.
     *
     * Returns null when the removal cannot be reconciled without
     * approximating: it would leave non-zero residual value behind a
     * fully-emptied balance, or it would drive the accumulator negative.
     * Both are the "reversal boundary" #579 asks for — the caller must
     * refuse the operation (409) rather than silently approximate.
     */
    public static function subtractValue(float $priorTotalValue, float $remainingQty, float $removedQty, float $removedUnitCost): ?float
    {
        $removed = bcmul(self::toDecimalString($removedQty), self::toDecimalString($removedUnitCost), self::CALC_SCALE);
        $remaining = bcsub(self::toDecimalString($priorTotalValue), $removed, self::CALC_SCALE);

        if (bccomp(self::toDecimalString($remainingQty), '0', self::CALC_SCALE) <= 0) {
            return self::isReconcilableToZero($remaining) ? 0.0 : null;
        }

        if (bccomp($remaining, '0', self::CALC_SCALE) < 0) {
            return null;
        }

        return round((float) $remaining, self::RESULT_SCALE);
    }

    /**
     * The display-only weighted-average unit cost implied by the exact value
     * accumulator and the current on-hand quantity — rounded once, fresh,
     * from the accumulator itself, never by reusing a previously-rounded
     * average as an input to a later calculation.
     */
    public static function averageCost(float $totalValue, float $onHand): float
    {
        if (bccomp(self::toDecimalString($onHand), '0', self::CALC_SCALE) <= 0) {
            return 0.0;
        }

        return round((float) bcdiv(self::toDecimalString($totalValue), self::toDecimalString($onHand), self::CALC_SCALE), self::RESULT_SCALE);
    }

    /**
     * Whether a residual money value is small enough to be a rounding
     * artifact rather than real unattributed value left behind a
     * fully-emptied balance.
     */
    private static function isReconcilableToZero(string $value): bool
    {
        $abs = bccomp($value, '0', self::CALC_SCALE) < 0 ? bcmul($value, '-1', self::CALC_SCALE) : $value;

        return bccomp($abs, self::RESIDUAL_TOLERANCE, self::CALC_SCALE) < 0;
    }

    private static function toDecimalString(float $value): string
    {
        return number_format($value, self::CALC_SCALE, '.', '');
    }
}
