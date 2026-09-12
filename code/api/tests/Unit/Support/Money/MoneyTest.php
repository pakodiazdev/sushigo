<?php

namespace Tests\Unit\Support\Money;

use App\Exceptions\Money\InvalidMoneyValueException;
use App\Support\Money\Decimal;
use App\Support\Money\Money;
use Tests\TestCase;

class MoneyTest extends TestCase
{
    public function test_from_decimal_string_and_to_decimal_string_round_trip(): void
    {
        $this->assertSame('1234.56', Money::fromDecimalString('1234.56')->toDecimalString());
        $this->assertSame('-3.00', Money::fromDecimalString('-3')->toDecimalString());
        $this->assertSame('0.05', Money::fromDecimalString('.05')->toDecimalString());
        $this->assertSame('0.00', Money::zero()->toDecimalString());
    }

    public function test_from_minor_units(): void
    {
        $this->assertSame('100.00', Money::fromMinorUnits(10000)->toDecimalString());
        $this->assertSame('-1.23', Money::fromMinorUnits(-123)->toDecimalString());
    }

    public function test_from_decimal_string_rejects_a_float_argument(): void
    {
        $this->expectException(InvalidMoneyValueException::class);
        $this->expectExceptionMessageMatches('/floats are never accepted/');

        // @phpstan-ignore-next-line — deliberately passing an illegal type to prove it's rejected.
        Money::fromDecimalString(1234.56);
    }

    public function test_from_minor_units_rejects_a_float_argument(): void
    {
        $this->expectException(InvalidMoneyValueException::class);
        $this->expectExceptionMessageMatches('/floats are never accepted/');

        // @phpstan-ignore-next-line — deliberately passing an illegal type to prove it's rejected.
        Money::fromMinorUnits(100.0);
    }

    public function test_from_decimal_string_rejects_more_than_scale_fractional_digits(): void
    {
        $this->expectException(InvalidMoneyValueException::class);

        Money::fromDecimalString('1.005');
    }

    public function test_from_decimal_string_rejects_non_numeric_input(): void
    {
        $this->expectException(InvalidMoneyValueException::class);

        Money::fromDecimalString('abc');
    }

    public function test_add_and_subtract_require_the_same_currency(): void
    {
        $mxn = Money::fromDecimalString('10.00', 'MXN');
        $usd = Money::fromDecimalString('10.00', 'USD');

        $this->assertSame('20.00', $mxn->add(Money::fromDecimalString('10.00', 'MXN'))->toDecimalString());
        $this->assertSame('5.00', $mxn->subtract(Money::fromDecimalString('5.00', 'MXN'))->toDecimalString());

        $this->expectException(InvalidMoneyValueException::class);
        $mxn->add($usd);
    }

    public function test_negate_and_sign_predicates(): void
    {
        $positive = Money::fromDecimalString('5.00');
        $negative = $positive->negate();

        $this->assertTrue($positive->isPositive());
        $this->assertTrue($negative->isNegative());
        $this->assertTrue(Money::zero()->isZero());
    }

    public function test_equals_and_compare_to(): void
    {
        $a = Money::fromDecimalString('10.00');
        $b = Money::fromMinorUnits(1000);

        $this->assertTrue($a->equals($b));
        $this->assertSame(0, $a->compareTo($b));
        $this->assertSame(-1, Money::fromDecimalString('1.00')->compareTo(Money::fromDecimalString('2.00')));
    }

    public function test_equals_is_false_across_currencies_even_with_the_same_minor_units(): void
    {
        $mxn = Money::fromMinorUnits(1000, 'MXN');
        $usd = Money::fromMinorUnits(1000, 'USD');

        $this->assertFalse($mxn->equals($usd));
    }

    public function test_multiply_by_decimal_scales_an_amount_by_a_rate_and_rounds_half_up(): void
    {
        // A 16% tax rate applied to MXN 250.00.
        $tax = Money::fromDecimalString('250.00')->multiplyByDecimal(Decimal::of('0.16', 4));
        $this->assertSame('40.00', $tax->toDecimalString());

        // 99.99 * 10% = 9.999, which rounds half-up to the nearest cent, not down.
        $discount = Money::fromDecimalString('99.99')->multiplyByDecimal(Decimal::of('0.10', 4));
        $this->assertSame('10.00', $discount->toDecimalString());
    }

    public function test_multiply_by_decimal_rejects_a_result_that_overflows_the_integer_range(): void
    {
        // (int) on a numeric string past PHP_INT_MAX silently clamps to PHP_INT_MAX instead of
        // erroring — this must be caught before the cast, not corrupt the result to a smaller,
        // wrong amount.
        $this->expectException(InvalidMoneyValueException::class);

        Money::fromMinorUnits(PHP_INT_MAX)->multiplyByDecimal(Decimal::of('2', 0));
    }

    public function test_currency_must_look_like_an_iso_4217_code(): void
    {
        $this->expectException(InvalidMoneyValueException::class);

        Money::fromDecimalString('1.00', 'M');
    }

    public function test_to_float_for_legacy_boundary_only_is_an_explicit_escape_hatch(): void
    {
        $this->assertSame(1234.56, Money::fromDecimalString('1234.56')->toFloatForLegacyBoundaryOnly());
    }

    public function test_to_decimal_string_handles_php_int_min_without_a_float_overflow(): void
    {
        // abs(PHP_INT_MIN) cannot be represented as an int — its magnitude is one past
        // PHP_INT_MAX — and silently overflows to a float, whose string form can be
        // exponent notation. This is an artificial extreme, not a realistic amount, but the
        // conversion must still produce every digit rather than a malformed split.
        $this->assertSame('-92233720368547758.08', Money::fromMinorUnits(PHP_INT_MIN)->toDecimalString());
    }

    public function test_string_representation_includes_currency(): void
    {
        $this->assertSame('10.00 MXN', (string) Money::fromDecimalString('10.00'));
    }
}
