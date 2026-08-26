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
}
