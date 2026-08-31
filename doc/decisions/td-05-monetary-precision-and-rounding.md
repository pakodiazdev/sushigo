# TD-05 · Monetary amounts use two decimals while unit rates retain higher precision

**Status:** Accepted target; implementation pending in Sprint 8 issue
[#415](https://github.com/pakodiazdev/sushigo/issues/415).

## Decision

SushiGo adopts a hybrid fixed-point contract. A value's scale follows its domain meaning; a
four-decimal database column is not, by itself, the business contract.

| Value kind | Canonical scale | Boundary representation |
|---|---:|---|
| Money: totals, discounts, taxes, expenses, prices, payments | 2 | Integer minor units plus currency |
| Unit cost and weighted-average cost | 4 | Exact fixed-point decimal |
| Quantity in base or presentation units | 4 | Exact fixed-point decimal |
| Unit/presentation conversion factor | 6 | Exact fixed-point decimal |
| Percentage or rate | 4 | Exact fixed-point decimal |
| Intermediate arithmetic | At least 8 | Exact decimal; never binary float |

The final result of a monetary operation is rounded to scale 2 using `ROUND_HALF_UP`, unless a
specific legal or business rule explicitly defines another mode. Intermediate values are not
rounded early. Domain, database, PHP, API, and TypeScript boundaries must not convert these values
through PHP `float` or JavaScript `number`.

For purchase evidence, the transaction's two-decimal monetary total is authoritative. Unit cost
is a derived rate retained at scale 4; it is not used later to recreate or replace the original
total. For example, a receipt of MXN 100.00 for 24 base units produces a unit cost of `4.1667`,
while the immutable transaction evidence remains MXN 100.00. Any later valuation multiplies using
the higher-precision rate, keeps at least eight decimals during calculation, and rounds only when
it becomes a monetary result.

The API must serialize exact decimals without a binary-float hop. Sprint 8 issue #415 owns the
field inventory, compatibility strategy, migration sequence, shared PHP/TypeScript primitives,
and enforcement tests. Until that issue is delivered, existing `decimal(15,4)` fields and float
DTO boundaries are **as-built behavior**, not compliance with this target decision.

## Justification

Two decimals match MXN's settlement unit and the way users understand prices, payments, receipt
totals, and reports. Applying two decimals to every value, however, loses economically relevant
information in quantities, conversion factors, per-unit acquisition costs, and repeated
weighted-average blends. Applying four decimals to every visible monetary value exposes technical
precision as if it were payable currency and still does not solve binary floating-point errors.

The hybrid contract keeps monetary evidence familiar and auditable while preserving sufficient
precision for derived inventory valuation. Integer minor units make currency amounts exact;
fixed-point decimals retain the fractional precision required by rates and physical quantities.
Explicit rounding boundaries also ensure preview, persistence, reporting, and frontend totals
produce the same result.

## Consequences

- Existing four-decimal monetary columns may remain temporarily during migration, but writes and
  public contracts must converge on the two-decimal Money rule.
- `effective_unit_cost` and `Stock.weighted_avg_cost` retain four decimals; this is intentional and
  does not imply that receipt totals or payments have four currency decimals.
- A line's rounded unit cost multiplied back by its quantity may differ slightly from its original
  total. The stored transaction total remains authoritative, so reports must sum monetary evidence
  rather than reconstructing it from a rounded unit rate.
- Each calculation must name its rounding boundary. Formatting is presentation only and cannot be
  used as domain rounding.
- Migrations must be lossless and reversible, and contract tests must cover halfway cases,
  fractional unit costs, repeated blends, large values, and frontend/backend parity.

## When to revisit

Revisit the Money scale when multi-currency support is introduced, because currencies can have
zero, two, three, or other minor-unit conventions. Store scale/currency metadata rather than
assuming every future currency behaves like MXN.

Revisit the four/six/eight-decimal working scales when measured quantities, supplier contracts,
tax rules, or observed accumulated error demonstrate a concrete need. Change them as a versioned
domain decision with migration and compatibility evidence, not by widening isolated columns.
