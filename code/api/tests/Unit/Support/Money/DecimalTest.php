<?php

namespace Tests\Unit\Support\Money;

use App\Exceptions\Money\InvalidMoneyValueException;
use App\Support\Money\Decimal;
use Tests\TestCase;

class DecimalTest extends TestCase
{
    public function test_of_normalizes_and_rounds_to_scale(): void
    {
        $this->assertSame('4.1667', Decimal::of('4.16666', 4)->__toString());
        $this->assertSame('4.1668', Decimal::of('4.16675', 4)->__toString());
        $this->assertSame('3', Decimal::of(3, 0)->__toString());
    }

    public function test_of_rejects_a_float_argument(): void
    {
        $this->expectException(InvalidMoneyValueException::class);
        $this->expectExceptionMessageMatches('/floats are never accepted/');

        // @phpstan-ignore-next-line — deliberately passing an illegal type to prove it's rejected.
        Decimal::of(4.5, 2);
    }

    public function test_of_rejects_non_numeric_input(): void
    {
        $this->expectException(InvalidMoneyValueException::class);

        Decimal::of('not-a-number', 4);
    }

    public function test_of_rejects_scientific_notation(): void
    {
        // Expanding scientific notation via a (float) cast is itself an unsafe binary-float
        // boundary crossing (large exponents overflow to INF, which bcmath then rejects with
        // an uncaught ValueError) — Decimal must reject it outright, the same as Money does.
        $this->expectException(InvalidMoneyValueException::class);

        Decimal::of('9.999999999999999e20', 12);
    }

    public function test_of_rejects_negative_scale(): void
    {
        $this->expectException(InvalidMoneyValueException::class);

        Decimal::of('1', -1);
    }

    public function test_zero(): void
    {
        $this->assertTrue(Decimal::zero(4)->isZero());
        $this->assertSame('0.0000', Decimal::zero(4)->__toString());
    }

    public function test_add_subtract_multiply_divide(): void
    {
        $a = Decimal::of('10.5000', 4);
        $b = Decimal::of('3.2500', 4);

        $this->assertSame('13.7500', $a->add($b)->__toString());
        $this->assertSame('7.2500', $a->subtract($b)->__toString());
        // multiply()'s default result scale is the *sum* of both operand scales (4 + 4 = 8),
        // not their max, since that's what an exact product actually needs — see
        // test_multiply_defaults_to_the_sum_of_operand_scales() below for why.
        $this->assertSame('34.12500000', $a->multiply($b)->__toString());
        $this->assertSame('3.2308', $a->divide($b)->__toString());
    }

    public function test_multiply_defaults_to_the_sum_of_operand_scales(): void
    {
        // At scale 4, 0.0001 × 0.0001 is exactly 0.00000001 — defaulting the result scale to
        // max(4, 4) = 4 instead of the sum would round that straight back down to 0.0000.
        $a = Decimal::of('0.0001', 4);
        $b = Decimal::of('0.0001', 4);

        $this->assertSame('0.00000001', $a->multiply($b)->__toString());
    }

    public function test_divide_by_zero_throws(): void
    {
        $this->expectException(InvalidMoneyValueException::class);

        Decimal::of('1', 4)->divide(Decimal::zero(4));
    }

    public function test_negate_and_sign_predicates(): void
    {
        $positive = Decimal::of('5', 2);
        $negative = $positive->negate();

        $this->assertTrue($positive->isPositive());
        $this->assertFalse($positive->isNegative());
        $this->assertTrue($negative->isNegative());
        $this->assertFalse($negative->isPositive());
        $this->assertSame('-5.00', $negative->__toString());
    }

    public function test_equals_and_compare_to_ignore_differing_scales(): void
    {
        $a = Decimal::of('1.50', 2);
        $b = Decimal::of('1.5000', 4);

        $this->assertTrue($a->equals($b));
        $this->assertSame(0, $a->compareTo($b));
        $this->assertSame(-1, Decimal::of('1', 0)->compareTo(Decimal::of('2', 0)));
        $this->assertSame(1, Decimal::of('2', 0)->compareTo(Decimal::of('1', 0)));
    }

    public function test_with_scale_rounds_when_narrowing_and_pads_when_widening(): void
    {
        $value = Decimal::of('4.16666', 5);

        $this->assertSame('4.1667', $value->withScale(4)->__toString());
        $this->assertSame('4.166660', $value->withScale(6)->__toString());
    }

    public function test_round_half_up_matches_expected_boundary_values(): void
    {
        $this->assertSame('1.24', Decimal::of('1.235', 2)->__toString());
        $this->assertSame('-1.24', Decimal::of('-1.235', 2)->__toString());
        $this->assertSame('0.00', Decimal::of('0.001', 2)->__toString());
        $this->assertSame('0.01', Decimal::of('0.005', 2)->__toString());
    }

    public function test_to_float_for_legacy_boundary_only_is_an_explicit_escape_hatch(): void
    {
        $this->assertSame(4.1667, Decimal::of('4.1667', 4)->toFloatForLegacyBoundaryOnly());
    }

    public function test_large_values_and_repeated_blends_stay_exact(): void
    {
        $total = Decimal::zero(8);
        for ($i = 0; $i < 1000; $i++) {
            $total = $total->add(Decimal::of('0.1', 8), 8);
        }

        $this->assertSame('100.00000000', $total->__toString());
    }

    public function test_arithmetic_above_calc_scale_does_not_truncate(): void
    {
        // Scale 15 exceeds the internal CALC_SCALE (12) — the working precision for both
        // construction and arithmetic must scale up with it, not silently drop to zero.
        $a = Decimal::of('0.000000000000001', 15);
        $b = Decimal::of('0.000000000000001', 15);

        $this->assertSame('0.000000000000001', $a->__toString());
        $this->assertSame('0.000000000000002', $a->add($b)->__toString());
    }

    public function test_multiply_above_calc_scale_stays_exact(): void
    {
        $a = Decimal::of('0.0000000001', 10);
        $b = Decimal::of('0.0000000001', 10);

        $this->assertSame('0.00000000000000000001', $a->multiply($b, 20)->__toString());
    }
}
