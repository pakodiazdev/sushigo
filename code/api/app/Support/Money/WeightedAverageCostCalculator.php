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

    private static function toDecimalString(float $value): string
    {
        return number_format($value, self::CALC_SCALE, '.', '');
    }
}
