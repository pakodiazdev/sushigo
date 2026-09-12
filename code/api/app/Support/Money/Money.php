<?php

declare(strict_types=1);

namespace App\Support\Money;

use App\Exceptions\Money\InvalidMoneyValueException;
use Stringable;

/**
 * Exact currency amount — transaction totals, prices, taxes, discounts, expenses, and
 * payments — per TD-05 (#415): scale 2, represented as an integer count of minor units
 * (cents for MXN) plus a currency code. `Decimal` (also #415) is the sibling primitive for
 * rates (unit cost, quantities, conversion factors) at higher scale; the two are never
 * interchangeable — there is no implicit conversion between them, only the explicit
 * `Decimal`-driven allocation methods below.
 *
 * There is deliberately no constructor or factory that accepts a PHP `float`.
 * `fromMinorUnits()`/`fromDecimalString()` declare their value parameter `mixed` and check
 * it at runtime with `is_int()`/`is_string()` rather than typing it `int`/`string` directly,
 * because PHP's own weak-mode scalar coercion would otherwise silently truncate a `float`
 * argument (with only a deprecation notice, never an exception) whenever the *calling* file
 * lacks `declare(strict_types=1)`, which this codebase does not yet enforce everywhere. This
 * is the "reject floats at domain boundaries" requirement from #415's Implementation Scope,
 * made unconditional rather than dependent on every caller's own strict-types setting.
 *
 * Out of scope (per #415's own "Out of Scope" section): multi-currency conversion and
 * exchange rates. `$currency` is carried so a future multi-currency pivot has the metadata
 * already in place (per TD-05's "When to revisit"), but every arithmetic method below
 * requires both operands to already share the same currency — it does not convert between
 * currencies.
 */
final readonly class Money implements Stringable
{
    /** @var int */
    public const SCALE = 2;

    /** @var string */
    public const DEFAULT_CURRENCY = 'MXN';

    private function __construct(
        public int $minorUnits,
        public string $currency,
    ) {}

    public static function fromMinorUnits(mixed $minorUnits, string $currency = self::DEFAULT_CURRENCY): self
    {
        if (! is_int($minorUnits)) {
            $type = get_debug_type($minorUnits);

            throw new InvalidMoneyValueException(
                "Money::fromMinorUnits() requires an int, got {$type}".
                (is_float($minorUnits) ? ' — floats are never accepted at this boundary (see class docblock).' : '.')
            );
        }

        return new self($minorUnits, self::normalizeCurrency($currency));
    }

    /**
     * @param  mixed  $decimal  A base-10 decimal string (e.g. `'1234.56'`, `'-3.00'`). Never a
     *                          `float` — see class docblock. Must carry at most `Money::SCALE`
     *                          fractional digits; a fractional-cent input (e.g. from an
     *                          un-rounded `Decimal` allocation) must be rounded explicitly with
     *                          `Decimal::of($decimal, Money::SCALE)->__toString()` before it
     *                          reaches here — this constructor never rounds silently.
     */
    public static function fromDecimalString(mixed $decimal, string $currency = self::DEFAULT_CURRENCY): self
    {
        if (! is_string($decimal)) {
            $type = get_debug_type($decimal);

            throw new InvalidMoneyValueException(
                "Money::fromDecimalString() requires a string, got {$type}".
                (is_float($decimal) ? ' — floats are never accepted at this boundary (see class docblock).' : '.')
            );
        }

        $trimmed = trim($decimal);

        if ($trimmed === '' || ! is_numeric($trimmed) || stripos($trimmed, 'e') !== false) {
            throw new InvalidMoneyValueException("'{$decimal}' is not a valid Money amount.");
        }

        $negative = str_starts_with($trimmed, '-');
        $abs = $negative ? substr($trimmed, 1) : $trimmed;

        $parts = explode('.', $abs, 2);
        $whole = $parts[0] === '' ? '0' : $parts[0];
        $fraction = $parts[1] ?? '';

        if (strlen($fraction) > self::SCALE) {
            throw new InvalidMoneyValueException(
                "'{$decimal}' has more than ".self::SCALE.' fractional digits — round explicitly before constructing a Money value.'
            );
        }

        $fraction = str_pad($fraction, self::SCALE, '0');
        $minorUnits = ((int) $whole) * (10 ** self::SCALE) + (int) $fraction;

        return self::fromMinorUnits($negative ? -$minorUnits : $minorUnits, $currency);
    }

    public static function zero(string $currency = self::DEFAULT_CURRENCY): self
    {
        return self::fromMinorUnits(0, $currency);
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return self::fromMinorUnits($this->minorUnits + $other->minorUnits, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        return self::fromMinorUnits($this->minorUnits - $other->minorUnits, $this->currency);
    }

    public function negate(): self
    {
        return self::fromMinorUnits(-$this->minorUnits, $this->currency);
    }

    /**
     * Scales this amount by an exact `Decimal` rate (e.g. a discount percentage, a tax rate,
     * or an allocation share), rounding the fractional-cent result half-up to `Money::SCALE`.
     * This is the only sanctioned way to derive a `Money` value from a rate — never multiply
     * a `Decimal` unit cost back into a `Money` total (per TD-05: totals are authoritative
     * evidence, unit cost is a derived rate).
     */
    public function multiplyByDecimal(Decimal $factor): self
    {
        // Multiply the raw minor-unit integer by the rate at high intermediate precision,
        // then round half-up to the nearest whole minor unit — the fractional-cent result a
        // rate multiplication produces is never carried forward as partial cents.
        $product = Decimal::of($this->minorUnits, 0)->multiply($factor, self::SCALE + 6);
        $roundedMinorUnits = Decimal::of($product->value, 0);

        // `(int)` on a numeric string outside PHP's integer range silently clamps instead of
        // erroring — casting a too-large bcmath result would return PHP_INT_MAX (a corrupted,
        // *smaller* amount) rather than the true product or a visible failure. An exact-value
        // primitive must never do that quietly, so the bounds are checked as exact-decimal
        // strings (never via a float comparison) before the cast is allowed to happen at all.
        if (
            bccomp($roundedMinorUnits->value, (string) PHP_INT_MAX, 0) > 0
            || bccomp($roundedMinorUnits->value, (string) PHP_INT_MIN, 0) < 0
        ) {
            throw new InvalidMoneyValueException(
                "Money::multiplyByDecimal() result ({$roundedMinorUnits->value} minor units) overflows PHP's integer range."
            );
        }

        return self::fromMinorUnits((int) $roundedMinorUnits->value, $this->currency);
    }

    public function isZero(): bool
    {
        return $this->minorUnits === 0;
    }

    public function isNegative(): bool
    {
        return $this->minorUnits < 0;
    }

    public function isPositive(): bool
    {
        return $this->minorUnits > 0;
    }

    public function equals(self $other): bool
    {
        return $this->currency === $other->currency && $this->minorUnits === $other->minorUnits;
    }

    public function compareTo(self $other): int
    {
        $this->assertSameCurrency($other);

        return $this->minorUnits <=> $other->minorUnits;
    }

    public function toDecimalString(): string
    {
        // `ltrim` on the signed string, not `abs()`, since `abs(PHP_INT_MIN)` cannot be
        // represented as an int (its magnitude is one past PHP_INT_MAX) and silently
        // overflows to a float — whose string form can be exponent notation, which the
        // substring split below would then slice as if it were decimal digits.
        $negative = $this->minorUnits < 0;
        $abs = ltrim((string) $this->minorUnits, '-');
        $abs = str_pad($abs, self::SCALE + 1, '0', STR_PAD_LEFT);

        $whole = substr($abs, 0, -self::SCALE);
        $fraction = substr($abs, -self::SCALE);

        return ($negative ? '-' : '').$whole.'.'.$fraction;
    }

    /**
     * Converts to a binary float. Named explicitly (not `__toFloat`/implicit) so every call
     * site is grep-able — this is a deliberate, visible escape hatch for boundaries this PR
     * does not yet migrate, never for a value that stays inside domain arithmetic.
     */
    public function toFloatForLegacyBoundaryOnly(): float
    {
        return (float) $this->toDecimalString();
    }

    public function __toString(): string
    {
        return $this->toDecimalString().' '.$this->currency;
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidMoneyValueException(
                "Cannot operate on Money values in different currencies ({$this->currency} vs {$other->currency})."
            );
        }
    }

    private static function normalizeCurrency(string $currency): string
    {
        $normalized = strtoupper(trim($currency));

        if (! preg_match('/^[A-Z]{3}$/', $normalized)) {
            throw new InvalidMoneyValueException("'{$currency}' is not a valid ISO 4217-shaped currency code.");
        }

        return $normalized;
    }
}
