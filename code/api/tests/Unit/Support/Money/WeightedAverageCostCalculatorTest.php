<?php

namespace Tests\Unit\Support\Money;

use App\Support\Money\WeightedAverageCostCalculator;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class WeightedAverageCostCalculatorTest extends TestCase
{
    #[Test]
    public function it_blends_prior_and_added_value_into_a_weighted_average()
    {
        // (10*100 + 20*150) / 30 = 4000/30 = 133.3333...
        $result = WeightedAverageCostCalculator::blend(
            priorQty: 10,
            priorAvgCost: 100,
            addedQty: 20,
            addedUnitCost: 150,
        );

        $this->assertEquals(133.3333, $result);
    }

    #[Test]
    public function it_returns_the_added_unit_cost_on_zero_prior_stock()
    {
        $result = WeightedAverageCostCalculator::blend(
            priorQty: 0,
            priorAvgCost: 0,
            addedQty: 24,
            addedUnitCost: 20.625,
        );

        $this->assertEquals(20.625, $result);
    }

    #[Test]
    public function it_returns_the_added_unit_cost_when_prior_quantity_is_negative()
    {
        // Defensive: a caller passing a negative prior quantity (should never
        // happen given Stock's own on_hand >= 0 invariant) must not be
        // treated as if it inflates the denominator.
        $result = WeightedAverageCostCalculator::blend(
            priorQty: -5,
            priorAvgCost: 999,
            addedQty: 10,
            addedUnitCost: 50,
        );

        $this->assertEquals(50.0, $result);
    }

    #[Test]
    public function it_rounds_to_four_decimals_using_exact_decimal_arithmetic()
    {
        // 1 unit at 0.1 blended with 1 unit at 0.2 must land on the exact
        // decimal average (0.15), not a float-drifted neighbor like
        // 0.14999999999999999 that naive (float) arithmetic can produce for
        // these exact inputs.
        $result = WeightedAverageCostCalculator::blend(
            priorQty: 1,
            priorAvgCost: 0.1,
            addedQty: 1,
            addedUnitCost: 0.2,
        );

        $this->assertSame(0.15, $result);
    }

    #[Test]
    public function it_produces_the_same_result_regardless_of_call_order_for_associative_inputs()
    {
        // Multi-location regression guard: blending location A's receipt
        // then location B's must be independent of blending B then A when
        // starting from the same zero base — both must reach the same
        // final average for the combined quantity.
        $first = WeightedAverageCostCalculator::blend(0, 0, 24, 20.625);
        $combinedAfterFirst = WeightedAverageCostCalculator::blend(24, $first, 10, 30);

        $second = WeightedAverageCostCalculator::blend(0, 0, 10, 30);
        $combinedAfterSecond = WeightedAverageCostCalculator::blend(10, $second, 24, 20.625);

        $this->assertEquals($combinedAfterFirst, $combinedAfterSecond);
    }

    #[Test]
    public function add_value_accumulates_exactly_across_receipts(): void
    {
        $first = WeightedAverageCostCalculator::addValue(priorTotalValue: 0, addedQty: 100, addedUnitCost: 10);
        $this->assertSame(1000.0, $first);

        $second = WeightedAverageCostCalculator::addValue(priorTotalValue: $first, addedQty: 100, addedUnitCost: 20);
        $this->assertSame(3000.0, $second);
    }

    #[Test]
    public function subtract_value_is_the_exact_inverse_of_add_value_for_a_single_receipt(): void
    {
        $total = WeightedAverageCostCalculator::addValue(priorTotalValue: 0, addedQty: 100, addedUnitCost: 10);

        $result = WeightedAverageCostCalculator::subtractValue(
            priorTotalValue: $total,
            remainingQty: 0,
            removedQty: 100,
            removedUnitCost: 10,
        );

        $this->assertSame(0.0, $result);
    }

    #[Test]
    public function subtract_value_leaves_exactly_the_other_receipts_own_value(): void
    {
        // The Issue's own risk example: 100 @ 10 (1,000) then 100 @ 20 (2,000)
        // accumulate to 3,000. Subtracting the second receipt's own evidenced
        // value must leave exactly the first's: 1,000 — not the naive
        // "1,500 for 100 units" the bug produced.
        $total = WeightedAverageCostCalculator::addValue(
            priorTotalValue: WeightedAverageCostCalculator::addValue(0, 100, 10),
            addedQty: 100,
            addedUnitCost: 20,
        );
        $this->assertSame(3000.0, $total);

        $result = WeightedAverageCostCalculator::subtractValue(
            priorTotalValue: $total,
            remainingQty: 100,
            removedQty: 100,
            removedUnitCost: 20,
        );

        $this->assertSame(1000.0, $result);
        $this->assertSame(10.0, WeightedAverageCostCalculator::averageCost($result, 100));
    }

    #[Test]
    public function subtract_value_does_not_compound_rounding_error_across_sequential_reversals(): void
    {
        // Codex review finding (#579 PR #626): reconstructing "prior value" as
        // qty * weighted_avg_cost compounds a fresh rounding error into every
        // successive reversal. Blending 1 unit @ 0.1 with 2 units @ 0.2 stores
        // a *rounded* average of 0.1667 — but the exact accumulator never
        // rounds until the final display step, so two sequential full
        // reversals still land on exactly zero, never a spurious residual.
        $total = WeightedAverageCostCalculator::addValue(
            priorTotalValue: WeightedAverageCostCalculator::addValue(0, 1, 0.1),
            addedQty: 2,
            addedUnitCost: 0.2,
        );
        $this->assertSame(0.5, $total);
        $this->assertSame(0.1667, WeightedAverageCostCalculator::averageCost($total, 3));

        // Reverse the first receipt (1 @ 0.1): 2 units remain.
        $afterFirstReversal = WeightedAverageCostCalculator::subtractValue(
            priorTotalValue: $total,
            remainingQty: 2,
            removedQty: 1,
            removedUnitCost: 0.1,
        );
        $this->assertSame(0.4, $afterFirstReversal);
        // Exactly 0.2 — not the 0.2001 a rounded-average reconstruction drifts to.
        $this->assertSame(0.2, WeightedAverageCostCalculator::averageCost($afterFirstReversal, 2));

        // Reverse the second receipt (2 @ 0.2): nothing should remain.
        $afterSecondReversal = WeightedAverageCostCalculator::subtractValue(
            priorTotalValue: $afterFirstReversal,
            remainingQty: 0,
            removedQty: 2,
            removedUnitCost: 0.2,
        );
        $this->assertNotNull($afterSecondReversal, 'An exact full reversal chain must never hit the residual-value boundary.');
        $this->assertSame(0.0, $afterSecondReversal);
    }

    #[Test]
    public function subtract_value_tolerates_intervening_consumption_that_never_changed_the_average(): void
    {
        // 100 @ 10 then 100 @ 20 => total value 3,000. Consuming 100 units
        // removes exactly 100*15=1,500 at the current average (Stock's own
        // decreaseOnHand() responsibility — simulated here directly), leaving
        // 1,500 for the remaining 100 units. Reversing the *second* receipt
        // (100 @ 20) would need 1,500-2,000=-500 => not reconcilable to a
        // positive value, so this must refuse rather than approximate.
        $result = WeightedAverageCostCalculator::subtractValue(
            priorTotalValue: 1500,
            remainingQty: 0,
            removedQty: 100,
            removedUnitCost: 20,
        );

        $this->assertNull($result);
    }

    #[Test]
    public function subtract_value_returns_null_when_it_would_leave_unexplained_residual_value_at_zero_stock(): void
    {
        // Same setup as above, but reversing the *first* receipt (100 @ 10)
        // instead: 1,500 - 1,000 = 500 of value with nowhere to attribute it,
        // since consumption already zeroed the remaining quantity.
        $result = WeightedAverageCostCalculator::subtractValue(
            priorTotalValue: 1500,
            remainingQty: 0,
            removedQty: 100,
            removedUnitCost: 10,
        );

        $this->assertNull($result);
    }

    #[Test]
    public function subtract_value_reaches_exact_zero_on_a_full_reversal_to_empty_stock(): void
    {
        $total = WeightedAverageCostCalculator::addValue(0, 240, 20);

        $result = WeightedAverageCostCalculator::subtractValue(
            priorTotalValue: $total,
            remainingQty: 0,
            removedQty: 240,
            removedUnitCost: 20,
        );

        $this->assertSame(0.0, $result);
    }

    #[Test]
    public function add_and_subtract_value_handle_zero_cost_and_fractional_costs_exactly(): void
    {
        // Free/bonus goods (unit cost 0): no value ever added, so removing it
        // leaves the rest of the accumulator completely untouched.
        $total = WeightedAverageCostCalculator::addValue(3100, 24, 0);
        $this->assertSame(3100.0, $total);

        $afterReversal = WeightedAverageCostCalculator::subtractValue(
            priorTotalValue: $total,
            remainingQty: 100,
            removedQty: 24,
            removedUnitCost: 0,
        );
        $this->assertSame(3100.0, $afterReversal);

        // Fractional unit costs stay exact via bcmath, never float-drifted.
        $fractionalTotal = WeightedAverageCostCalculator::addValue(0.15, 1, 0.2);
        $this->assertSame(0.35, $fractionalTotal);
    }

    #[Test]
    public function average_cost_is_zero_for_zero_or_negative_on_hand(): void
    {
        $this->assertSame(0.0, WeightedAverageCostCalculator::averageCost(500, 0));
        $this->assertSame(0.0, WeightedAverageCostCalculator::averageCost(500, -5));
    }
}
