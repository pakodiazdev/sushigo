# Monetary Value Contract

> Implements [TD-05](../../decisions/td-05-monetary-precision-and-rounding.md) for
> [#415](https://github.com/pakodiazdev/sushigo/issues/415). This document is the field inventory
> and the delivered-vs-deferred split TD-05 itself defers to this issue. Updated only for behavior
> actually shipped — see "Delivery phases" below for what each phase covers.

## 1. The two primitives

TD-05 splits every domain value into two kinds, backed by two PHP value objects in
`App\Support\Money` (both immutable, both `bcmath`-backed, neither ever constructed from a PHP
`float`):

| Primitive | Backs | Scale | Representation |
|---|---|---:|---|
| `Money` | Transaction totals, prices, taxes, discounts, expenses, payments | 2 | Integer minor units (`int $minorUnits`) + `string $currency` |
| `Decimal` | Unit cost, weighted-average cost, quantities, conversion factors, rates, intermediate arithmetic | 4 (6 for conversion factors; ≥8 for intermediates) | Exact decimal string + explicit scale |

Neither primitive has a constructor or factory typed to accept `float`. Both accept `mixed` at
their value-parsing boundary and reject anything that is not an `int`/numeric `string` at runtime
— not merely via a PHP type declaration — because PHP's own weak-mode scalar coercion silently
truncates a `float` argument into an `int` (with only a deprecation notice, never an exception)
whenever the *calling* file lacks `declare(strict_types=1)`, which this codebase does not enforce
everywhere yet. See `Money`'s and `Decimal`'s class docblocks
(`code/api/app/Support/Money/{Money,Decimal}.php`) for the full reasoning.

`Money` and `Decimal` are never interchangeable — there is no implicit conversion. The only
sanctioned way to derive a `Money` amount from a `Decimal` rate is `Money::multiplyByDecimal()`
(e.g. applying a tax rate to a total); the reverse — multiplying a unit cost back up to
reconstruct a total — is never done, per TD-05's "totals are authoritative evidence" rule.

## 2. Delivery phases

TD-05 and #415's own Implementation Scope call for the migration to happen "in bounded phases."
This is **Phase 1**:

| Phase | Scope | Status |
|---|---|---|
| **1** (this PR) | `Money`/`Decimal` primitives; Purchase Receipt line amounts (`ReceiptLineData`, `ReceiptRequest`, `ReceiptService::createLine()`) — the concrete cross-boundary finding #415 cites | ✅ Delivered |
| 2+ | Opening Balance, Stock Out, Stock Movement financial evidence beyond the Receipt path, `WeightedAverageCostCalculator`/`Stock::applyWeightedAverageCost()`, the shared `InventoryEntryPostingData`/`InventoryEntryLineData` quantity+cost fields, price lists, dishes/extras, cash, payroll, reports | Follow-up issues (see #415's close-out) |

Phase 1 deliberately does **not** touch quantity fields (`ordered_packages`, `received_packages`,
`base_units_received`, …) or the weighted-average-cost blend — those belong to the shared Stock
quantity system that #575/#579 already own pieces of, and widening Phase 1 to include them would
mean touching `StockMutationService`, `Stock::reserve()/release()`, `StockOutService`, and
`StockTransferService` well beyond the Receipt-line finding this issue names. Migrating those is
recorded as explicit follow-up work at close-out, not silently left undone.

## 3. Why no database migration in Phase 1

TD-05's own "Consequences" section allows this: *"Existing four-decimal monetary columns may
remain temporarily during migration, but writes and public contracts must converge on the
two-decimal Money rule."* Phase 1 takes that option because Laravel's `decimal:N` Eloquent cast
already returns an exact **string**, never a `float` — verified empirically
(`php artisan tinker`: assigning `'123.4567'` to a `decimal:4`-cast attribute and reading it back
returns the string `'123.4567'`, not a float). PostgreSQL's `NUMERIC` column type is already exact
fixed-point storage. The float boundary #415 cites was never in the database or the Eloquent
cast layer — it was in the PHP DTOs (`ReceiptLineData` typed its four amount fields `float`) and
in the plain PHP arithmetic operating on them (`ReceiptService::createLine()` subtracted/added/
divided native floats). Phase 1 fixes exactly that: the DTO and the arithmetic, not the schema.

The schema's eventual move to explicit `bigint` minor-units + `currency` columns (TD-05's
"boundary representation" column) is deferred to a later phase, together with the open API
representation decision below — both are genuine schema/contract changes that deserve their own
scoped migration and compatibility review, not a byproduct of the Receipt-line fix.

## 4. API representation decision (Architecture Decision checklist item)

**Decision:** Phase 1 keeps the existing JSON wire format unchanged. `ReceiptLineResource` still
serializes `gross_amount`, `discounts`, `allocated_expenses`, `non_recoverable_taxes`,
`net_acquisition_amount`, and `effective_unit_cost` as JSON numbers via `(float)` casts on the
now-exact model string values.

**Why this is safe:** the `(float)` cast in the Resource happens *after* every exactness-sensitive
step — validation, DTO construction, `Money`/`Decimal` arithmetic, and persistence — not before it.
It is the outermost serialization boundary, not a domain-arithmetic one. A 2-decimal `Money`
amount round-trips through PHP's `(float)` cast without drift for any value this domain actually
produces (verified: PHP's default `precision=14` renders `(string)(float)'123.45'` back to
`'123.45'`), so no existing webapp consumer sees a behavior change.

**Deferred:** switching the wire format itself (e.g. to a string, or to `{amount_minor, currency}`)
is a breaking API-contract change requiring client coordination across `code/webapp`. That decision
— and the compatibility/versioning strategy for existing clients — is left open for the phase that
actually changes the wire shape, not decided as a side effect of Phase 1.

## 5. Monetary field inventory

Every `decimal`-typed column in the schema as of Phase 1, classified against TD-05. "Phase"
records when each row's *PHP-layer* arithmetic is expected to adopt `Money`/`Decimal` — the column
type itself may lag per §3 above.

| Table.column | DB type | TD-05 kind | Target primitive | Phase |
|---|---|---|---|---:|
| `receipt_lines.gross_amount` | `decimal(15,4)` | Currency amount | `Money` (2) | **1 ✅** |
| `receipt_lines.discounts` | `decimal(15,4)` | Currency amount | `Money` (2) | **1 ✅** |
| `receipt_lines.allocated_expenses` | `decimal(15,4)` | Currency amount | `Money` (2) | **1 ✅** |
| `receipt_lines.non_recoverable_taxes` | `decimal(15,4)` | Currency amount | `Money` (2) | **1 ✅** |
| `receipt_lines.net_acquisition_amount` | `decimal(15,4)` | Derived total (authoritative evidence) | `Money` (2) | **1 ✅** |
| `receipt_lines.effective_unit_cost` | `decimal(15,4)` | Unit cost (derived rate) | `Decimal` (4) | **1 ✅** |
| `receipt_lines.ordered_packages` / `received_packages` / `bonus_packages` / `base_units_received` | `decimal(15,4)` | Quantity | `Decimal` (4) | 2 (Stock quantity system) |
| `receipt_lines.presentation_factor` | `decimal(15,4)` | Conversion factor | `Decimal` (6) | 2 |
| `stock.weighted_avg_cost` | `decimal(15,4)` | Unit cost | `Decimal` (4) | 2 |
| `item_variants.last_unit_cost` / `avg_unit_cost` | `decimal(15,4)` | Unit cost | `Decimal` (4) | 2 |
| `item_variants.sale_price` | `decimal(15,4)` | Currency amount | `Money` (2) | 2 (Pricing) |
| `item_variants.min_stock` | `decimal(15,4)` | Quantity (threshold) | `Decimal` (4) | 2 |
| `stock_movement_lines.unit_cost` | `decimal(15,4)` | Unit cost | `Decimal` (4) | 2 |
| `stock_movement_lines.line_total` / `sale_total` / `profit_total` | `decimal(15,4)` | Currency amount | `Money` (2) | 2 |
| `stock_movement_lines.sale_price` | `decimal(15,4)` | Currency amount | `Money` (2) | 2 |
| `stock_movement_lines.profit_margin` | `decimal(15,4)` | Rate/percentage | `Decimal` (4) | 2 |
| `stock_transfers.source_unit_cost` | `decimal(15,4)` | Unit cost | `Decimal` (4) | 2 |
| `variant_prices.price` | `decimal(15,4)` | Currency amount | `Money` (2) | 2 (Pricing) |
| `supplier_offerings.quoted_price` | `decimal(15,4)` | Currency amount | `Money` (2) | 2 (Purchasing) |
| `dishes.base_price` | `decimal(10,2)` | Currency amount | `Money` (2) | 2 (Menu) |
| `dish_extra_options.price_delta` | `decimal(10,2)` | Currency amount | `Money` (2) | 2 (Menu) |
| `cash_adjustment_lines.amount` | `decimal(12,4)` | Currency amount | `Money` (2) | 2 (Cash) |
| `cash_expenses.amount` | `decimal(12,4)` | Currency amount | `Money` (2) | 2 (Cash) |
| `wage_histories.hourly_rate` | `decimal(10,2)` | Currency amount (rate per hour) | `Money` (2) | 2 (Payroll) |
| `wage_histories.weekly_scheduled_hours` | `decimal(5,2)` | Quantity (hours) | `Decimal` (4) | 2 (Payroll) |
| `negotiated_extra_days.agreed_daily_wage` / `prima_amount` | `decimal(10,4)` | Currency amount | `Money` (2) | 2 (Payroll) |
| `punctuality_bonus_groups.weekly_bonus_amount` | `decimal(10,2)` | Currency amount | `Money` (2) | 2 (Payroll) |
| `pay_period_employees.total_pay` | `decimal(10,2)` | Currency amount | `Money` (2) | 2 (Payroll) |
| `pay_period_lines.amount` | `decimal(10,2)` | Currency amount | `Money` (2) | 2 (Payroll) |
| `attendances.overtime_amount` | `decimal(10,2)` | Currency amount | `Money` (2) | 2 (Payroll) |
| `overtime_bank_movement_*.amount` | `decimal(10,2)` | Currency amount | `Money` (2) | 2 (Payroll) |

Every row above already stores an exact decimal value in PostgreSQL and returns an exact string
through Laravel's `decimal:N` cast (see §3) — none of this is presently corrupt data. This table
records where PHP-layer arithmetic (not storage) still risks a `float` boundary once that domain's
own service/DTO layer touches these values with plain PHP operators, so a future phase has a ready
checklist instead of re-deriving it.

## 6. Rounding

The default final-money rounding mode is `ROUND_HALF_UP` (round half away from zero), matching
`round()`'s own default PHP behavior and this codebase's pre-existing convention (see
`WeightedAverageCostCalculator`, which already used `round($value, 4)`). `Decimal::of()` and
`Money`'s minor-unit derivation implement this manually via `bcmath` (`bcadd(..., '0.5', 0)` after
shifting to an integer scale, then shifting back) rather than relying on `bcround()` (PHP 8.4+),
since `composer.json` still declares `"php": "^8.2"` compatibility.

## 7. Related

- [TD-05](../../decisions/td-05-monetary-precision-and-rounding.md) — the accepted target this
  document implements.
- `code/api/app/Support/Money/Money.php`, `Decimal.php` — the primitives.
- `code/api/tests/Unit/Support/Money/` — primitive unit tests (fractional-cent rounding, large
  values, zero, negative, repeated blends, float rejection).
- `doc/architecture/purchasing/purchase-receipts.en.md` — the Receipt domain this phase touches.
