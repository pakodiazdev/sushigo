/**
 * Exact 2-decimal currency arithmetic, mirroring the backend's `Money` value object
 * (code/api/app/Support/Money/Money.php, #415 per TD-05:
 * doc/decisions/td-05-monetary-precision-and-rounding.md).
 *
 * JS `number` is IEEE-754 float64 — repeated add/subtract on decimal amounts drifts (the
 * canonical example: `0.1 + 0.2 === 0.30000000000000004`). Every function here round-trips
 * through an integer count of minor units (cents) so money math never depends on binary
 * float representation for the add/subtract step; only the final `minorUnitsToMoney()`
 * conversion back to a plain `number` (for display or a form field) crosses back to float,
 * the same "exact until the outermost boundary" shape the backend's `Money` class follows
 * (see that class's docblock for why the boundary crossing itself is safe there).
 *
 * This module intentionally stays at scale 2 (Money) only — it does not cover unit cost,
 * quantities, or conversion factors (`Decimal` on the backend), which stay plain `number`
 * for this phase; see doc/architecture/finance/monetary-value-contract.en.md §2 for what's
 * migrated in this phase versus deferred.
 */

const SCALE = 2
const SCALE_FACTOR = 10 ** SCALE

/**
 * Converts a decimal currency amount (e.g. a form field's parsed value) to an exact integer
 * count of minor units (cents for MXN), rounding half-up to the nearest cent — the same
 * rounding TD-05 mandates.
 */
export function moneyToMinorUnits(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new TypeError(`moneyToMinorUnits() requires a finite number, got ${String(amount)}`)
  }

  const scaled = amount * SCALE_FACTOR

  // Binary float can represent a decimal literal like `1.005` as slightly less than
  // intended (`1.00499999999999989...`), which would make a plain `Math.round` truncate
  // the wrong way exactly at a half-cent boundary. Nudging by a tiny epsilon — far smaller
  // than the `0.5` needed to flip any *other* rounding decision, far larger than the
  // ~1e-13 representable float error for realistic currency inputs — corrects this without
  // affecting anything else.
  const nudged = scaled >= 0 ? scaled + 1e-9 : scaled - 1e-9

  return Math.round(nudged)
}

/** Converts an exact integer count of minor units back to a plain decimal `number`. */
export function minorUnitsToMoney(minorUnits: number): number {
  return minorUnits / SCALE_FACTOR
}

/**
 * Sums any number of Money-shaped amounts exactly. Pass a negative amount to subtract it
 * (e.g. `addMoney(grossAmount, -discounts, allocatedExpenses)`), since minor-unit addition
 * is commutative and this avoids a separate `subtractMoney()` that would just negate anyway.
 */
export function addMoney(...amounts: number[]): number {
  const totalMinorUnits = amounts.reduce((sum, amount) => sum + moneyToMinorUnits(amount), 0)

  return minorUnitsToMoney(totalMinorUnits)
}
