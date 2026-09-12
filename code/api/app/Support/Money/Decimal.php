<?php

declare(strict_types=1);

namespace App\Support\Money;

use App\Exceptions\Money\InvalidMoneyValueException;
use Stringable;

/**
 * Exact fixed-point value for anything TD-05 classifies as a *rate*, not a currency amount
 * — unit cost, weighted-average cost, quantities, unit/presentation conversion factors, and
 * percentages/rates — plus the higher-precision intermediate result of arithmetic on any of
 * those. `Money` (also #415) is the sibling primitive for currency amounts at scale 2; the
 * two are never interchangeable, so there is no implicit conversion between them.
 *
 * Backed by `bcmath` so every operation is exact-decimal string arithmetic, never binary
 * float. There is deliberately no constructor or factory that accepts a PHP `float`.
 * `self::of()`'s `$value` parameter is declared `mixed` and checked at runtime with
 * `is_int()`/`is_string()` — not `int|string` — because PHP's own weak-mode scalar coercion
 * would otherwise silently truncate a `float` argument into an `int` (with only a
 * deprecation notice, never an exception) whenever the *calling* file lacks
 * `declare(strict_types=1)`, which this codebase does not yet enforce everywhere. A runtime
 * check makes the rejection unconditional regardless of the caller's own strict-types
 * setting. A caller holding a legacy `float` (e.g. an existing `decimal:4`-cast Eloquent
 * attribute, until its own migration lands) must convert it explicitly and visibly —
 * `Decimal::of((string) $legacyFloat, 4)` — so the conversion point is grep-able instead of
 * implicit.
 */
final readonly class Decimal implements Stringable
{
    /**
     * Working scale bcmath computes at internally before the final rounding step, matching
     * TD-05's "intermediate arithmetic retains at least scale 8".
     */
    /** @var int */
    private const CALC_SCALE = 12;

    private function __construct(
        public string $value,
        public int $scale,
    ) {}

    /**
     * @param  mixed  $value  A base-10 integer or decimal string (e.g. `'4.1667'`, `-3`), or a
     *                        plain `int`. Anything else — including a `float` — is rejected at
     *                        runtime; see class docblock for why this is `mixed` rather than
     *                        `int|string`.
     */
    public static function of(mixed $value, int $scale): self
    {
        if (! is_int($value) && ! is_string($value)) {
            $type = get_debug_type($value);

            throw new InvalidMoneyValueException(
                "Decimal::of() requires an int or a numeric string, got {$type}".
                (is_float($value) ? ' — floats are never accepted at this boundary (see class docblock).' : '.')
            );
        }

        if ($scale < 0) {
            throw new InvalidMoneyValueException("Decimal scale must be >= 0, got {$scale}.");
        }

        $normalized = self::normalize((string) $value);

        return new self(self::roundHalfUp($normalized, $scale), $scale);
    }

    public static function zero(int $scale): self
    {
        return self::of('0', $scale);
    }

    /**
     * Reinterprets this value at a different scale, rounding half-up if narrowing. Widening
     * (e.g. scale 4 → 8 before a division) never loses information — it only pads zeros.
     */
    public function withScale(int $scale): self
    {
        return self::of($this->value, $scale);
    }

    public function add(self $other, ?int $resultScale = null): self
    {
        $scale = self::workingScale($this->scale, $other->scale, $resultScale);

        return self::of(bcadd($this->value, $other->value, $scale), $resultScale ?? max($this->scale, $other->scale));
    }

    public function subtract(self $other, ?int $resultScale = null): self
    {
        $scale = self::workingScale($this->scale, $other->scale, $resultScale);

        return self::of(bcsub($this->value, $other->value, $scale), $resultScale ?? max($this->scale, $other->scale));
    }

    public function multiply(self $other, ?int $resultScale = null): self
    {
        // An exact product of two decimals needs the *sum* of their scales, not just the
        // larger one — 0.1 (scale 1) × 0.1 (scale 1) is 0.01 (scale 2) exactly. Defaulting
        // an omitted $resultScale to max(scale) instead (as add/subtract/divide do) would
        // erase that precision immediately: 0.0001 × 0.0001 at scale 4 would compute the
        // exact 0.00000001 and then round it straight back down to 0.0000. An explicit
        // $resultScale still wins — this default only fills the gap when the caller hasn't
        // said how much precision the product should keep.
        $resultScale ??= $this->scale + $other->scale;
        $scale = self::workingScale($resultScale, 0, $resultScale);

        return self::of(bcmul($this->value, $other->value, $scale), $resultScale);
    }

    /**
     * @throws InvalidMoneyValueException When dividing by zero.
     */
    public function divide(self $divisor, ?int $resultScale = null): self
    {
        $scale = self::workingScale($this->scale, $divisor->scale, $resultScale);

        if (bccomp($divisor->value, '0', $scale) === 0) {
            throw new InvalidMoneyValueException('Cannot divide a Decimal by zero.');
        }

        return self::of(bcdiv($this->value, $divisor->value, $scale), $resultScale ?? max($this->scale, $divisor->scale));
    }

    public function negate(): self
    {
        $scale = self::workingScale($this->scale, 0, null);

        return self::of(bcmul($this->value, '-1', $scale), $this->scale);
    }

    /**
     * The bcmath scale to compute an operation at: enough to preserve every operand's own
     * precision, the caller's requested result scale, and TD-05's own scale-8-minimum guard
     * — never fewer. Fixing this to the bare `CALC_SCALE` constant, as an earlier version of
     * this class did, silently truncated any operand or requested result scale above that
     * constant instead of computing it exactly (e.g. adding two scale-15 values produced 0
     * instead of the true sum, once BCMath's own scale-12 addition rounded both to zero).
     */
    private static function workingScale(int $scaleA, int $scaleB, ?int $resultScale): int
    {
        return max($scaleA, $scaleB, $resultScale ?? 0, self::CALC_SCALE) + 4;
    }

    public function isZero(): bool
    {
        return bccomp($this->value, '0', $this->scale) === 0;
    }

    public function isNegative(): bool
    {
        return bccomp($this->value, '0', $this->scale) < 0;
    }

    public function isPositive(): bool
    {
        return bccomp($this->value, '0', $this->scale) > 0;
    }

    public function equals(self $other): bool
    {
        return $this->compareTo($other) === 0;
    }

    public function compareTo(self $other): int
    {
        $scale = max($this->scale, $other->scale);

        return bccomp($this->value, $other->value, $scale);
    }

    /**
     * Converts to a binary float. Named explicitly (not `__toFloat`/implicit) so every call
     * site is grep-able — this is a deliberate, visible escape hatch for boundaries this PR
     * does not yet migrate (e.g. a legacy `decimal:4`-cast Eloquent attribute assignment),
     * never for a value that stays inside domain arithmetic.
     */
    public function toFloatForLegacyBoundaryOnly(): float
    {
        return (float) $this->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }

    private static function normalize(string $value): string
    {
        $trimmed = trim($value);

        if ($trimmed === '' || ! is_numeric($trimmed)) {
            throw new InvalidMoneyValueException("'{$value}' is not a valid decimal value.");
        }

        // bcmath requires plain decimal notation. Scientific notation (e.g. '1e3') must be
        // rejected outright, not expanded via `(float)` — that cast is exactly the binary-float
        // boundary this class exists to avoid crossing, and it isn't even safe as a one-off:
        // large exponents overflow to `INF`, which later bcmath calls (`bccomp`, `bcadd`, …)
        // reject with an uncaught ValueError since bcmath requires a well-formed numeric
        // string. `Money::fromDecimalString()` already rejects exponent notation the same way.
        if (stripos($trimmed, 'e') !== false) {
            throw new InvalidMoneyValueException("'{$value}' uses scientific notation, which Decimal does not accept — pass a plain decimal string.");
        }

        return $trimmed;
    }

    private static function roundHalfUp(string $value, int $scale): string
    {
        // Scale-relative, not the bare `CALC_SCALE` constant: rounding to a requested $scale
        // above CALC_SCALE needs working precision above it too, or the shift below already
        // truncates the very digits half-up rounding is supposed to look at.
        $workingScale = max($scale, self::CALC_SCALE) + 2;

        $negative = bccomp($value, '0', $workingScale) < 0;
        $abs = $negative ? bcmul($value, '-1', $workingScale) : $value;

        $factor = bcpow('10', (string) $scale);
        $shifted = bcmul($abs, $factor, $workingScale);
        // bcadd(..., 0) truncates the fractional part, so adding 0.5 before truncating is
        // exactly round-half-away-from-zero on the shifted (now-integer-scale) magnitude.
        $roundedAbs = bcadd($shifted, '0.5', 0);
        $result = bcdiv($roundedAbs, $factor, $scale);

        return $negative && bccomp($result, '0', $scale) !== 0 ? "-{$result}" : $result;
    }
}
