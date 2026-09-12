# 💰 Adopt an exact monetary value contract across API and webapp

**Labels:** backend, 🔨 technical-debt, investment: product-engineering, sprint-8

## Description

Adopt one exact monetary value contract across database, PHP domain/DTO arithmetic, API payloads,
and webapp calculations. This matures the original minor-unit proposal using the concrete Sprint 5
review finding: Purchase Receipt amounts still cross PHP `float` boundaries even though PostgreSQL
uses exact `DECIMAL` and weighted-average blending uses BCMath.

## Reason

Sprint 5 introduced real purchasing, discounts, expenses, taxes, weighted-average cost, branch
pricing, and margin evidence. Current examples include `ReceiptLineData::$grossAmount`,
`$discounts`, `$allocatedExpenses`, and `$nonRecoverableTaxes` as floats. Orders, adjustments,
returns, valuation, and reporting will multiply the number of arithmetic paths; the representation
must be settled before that expansion.

This is not evidence of a PostgreSQL storage bug. It is a cross-boundary contract problem.

## Objective

No domain-relevant monetary calculation depends on binary floating-point arithmetic, and every
layer agrees on representation, scale, rounding, currency, serialization, and migration behavior.

## 🔀 Scope split (Phase 1 / Phase 2)

This issue's own Implementation Scope calls for the migration to happen "in bounded phases." The
field inventory (§5 of
[doc/architecture/finance/monetary-value-contract.en.md](https://github.com/pakodiazdev/sushigo/blob/main/doc/architecture/finance/monetary-value-contract.en.md))
spans nearly every monetary column in the schema — Receipts, Opening Balance, Stock Out, Stock
Movement evidence, the shared weighted-average-cost blend, price lists, dishes/extras, cash, and
payroll. Delivering all of it as one PR against a real production financial system was a much
larger, higher-risk change than the concrete cross-boundary finding this issue cites.

**This issue is now scoped to Phase 1**: the `Money`/`Decimal` primitives, the full field
inventory/ADR, and the Purchase Receipt DTO/calculation fix — the exact finding named in
Description/Reason above. Every remaining domain is tracked in
[#621](https://github.com/pakodiazdev/sushigo/issues/621), which a human should schedule into a
sprint explicitly (this issue's own `sprint-8` label and estimate reflected the *original*,
unsplit scope). The sections below are narrowed to match; a struck-through or unchecked item
followed by "(#621)" means it moved there, not that it was skipped.

## Architecture Decision

- [x] Adopt
      [`TD-05`](https://github.com/pakodiazdev/sushigo/blob/main/doc/decisions/td-05-monetary-precision-and-rounding.md):
      transaction amounts,
      prices, taxes, discounts, and payments are Money at scale 2, represented as integer minor
      units plus currency; unit cost and weighted-average cost use exact scale 4; quantities scale
      4; conversion factors scale 6; rates scale 4; intermediate arithmetic retains at least scale
      8.
- [x] Define the default final-money rounding mode as `ROUND_HALF_UP`; a specific legal or business
      rule may override it only when documented at that operation's boundary.
- [x] Make transaction totals authoritative evidence. Unit cost is a higher-precision derived rate
      and must not be multiplied back to recreate or replace the original total.
- [x] Inventory every live monetary column/value and classify currency amount, unit cost, rate,
      percentage, derived total, or display-only value against TD-05.
- [x] Define API representation and version/compatibility strategy for existing clients.

## Implementation Scope

- [x] Introduce shared PHP Money/Decimal primitives that reject floats at domain boundaries.
- [x] Migrate Purchase Receipt DTO/calculation (`ReceiptLineData`, `ReceiptRequest`,
      `ReceiptService::createLine()`) — the concrete finding this issue cites. Every other named
      domain (weighted-average cost, Opening Balance, Stock Out, Stock Movement evidence, price
      lists, dishes/extras, cash, payroll, reports) is Phase 2, tracked in #621.
- [x] Introduce matching TypeScript types/helpers so webapp arithmetic never silently coerces exact
      values to unsafe JS floating point (`code/webapp/src/lib/money.ts`, applied to the Receipt
      preview calculation).
- [ ] Provide lossless, reversible database/data migrations when representation changes. _(Not
      needed for the Receipt fields Phase 1 touches — Laravel's `decimal:N` cast already returns an
      exact string, verified empirically; see §3 of the monetary value contract doc. Real schema
      migrations for other domains move to #621.)_
- [x] Normalize request validation, JsonResources/OpenAPI, seeders, factories, and formatting for
      the Receipt line-amount fields (`decimal:0,2` validation, regenerated Swagger, two seeder
      fixes). _(CSV/report exports and every other domain's own normalization move to #621.)_
- [x] Prevent new raw money `float`/untyped `number` boundaries through tests, for the Receipt
      line-amount surface this issue actually migrated (unit + Feature tests assert float
      rejection and exact arithmetic on a value shape that drifts under raw float). _(A repo-wide
      static-check tool — no PHPStan/Larastan is currently configured — moves to #621.)_

## Required Tests

- [x] Fractional-cent unit costs, large values, discounts/taxes, zero/free goods, negative
      adjustments where allowed, and repeated blends — for the `Money`/`Decimal` primitives.
- [x] Purchase preview and backend persistence produce the exact same result — PHP and TypeScript
      both tested against the same drifting-under-float value shape.
- [ ] Migration round-trip preserves every existing monetary value. _(No DB migration in Phase 1 —
      see Implementation Scope above; applies to #621's domains.)_
- [x] API compatibility/contract tests and frontend serialization/arithmetic tests — for the
      Receipt line-amount fields.
- [ ] Receipt reversal valuation and future count/adjustment flows consume the same primitive.
      _(This is #579's implementation, not #415's — #579 rebases onto this issue's merged
      primitive per the Dependencies note below.)_

## Acceptance Criteria

- [x] The ADR and inventory of monetary fields are complete, and implemented for the Purchase
      Receipt line-amount path this Phase 1 issue scopes to. _(Every other in-scope path is #621.)_
- [x] Receipt line-amount arithmetic (`ReceiptLineData`, `ReceiptService::createLine()`) contains
      no PHP float boundary. _(Broader "inventory-cost domain arithmetic" — Stock, weighted-average
      cost, Opening Balance, Stock Out — is #621.)_
- [x] The Receipt preview's webapp totals do not use unsafe binary-float money arithmetic.
      _(Every other webapp money calculation is #621.)_
- [x] Database, API, PHP, and TypeScript contracts agree on scale and representation for the
      Receipt line-amount fields. _(Every other domain's contract is #621.)_
- [ ] Existing data migrates and rolls back without precision loss. _(No DB migration in Phase 1;
      applies to #621's domains.)_
- [x] OpenAPI and financial architecture documentation reflect the delivered (Phase 1) contract.

## Dependencies and Parallelization

- This is a Sprint 8 financial foundation from the Sprint 5 review.
- Coordinate with the Receipt reversal valuation Issue (#579); settle the Money representation
  before its final value-ledger implementation. #579 rebases onto this issue's merged primitive
  and Receipt-path migration — it does not need #621 (Phase 2) to start its own design/
  implementation, only this issue's Phase 1.
- Every other named domain (weighted-average cost, Opening Balance, Stock Out, Stock Movement
  evidence, price lists, dishes/extras, cash, payroll, reports) is [#621](https://github.com/pakodiazdev/sushigo/issues/621)
  — see "Scope split" above.
- Migration owners must remain single-writer per monetary table.

## Out of Scope

- Multi-currency conversion, exchange rates, taxation policy, or accounting-ledger functionality.
- Changing business prices/costs as part of the representation migration.

## ⏱️ Time

- **Optimistic:** `12h`
- **Pessimistic:** `24h`
- **Tracked:** `1h16m`

```json
[
  { "date": "2026-09-11", "start": "20:03", "end": "20:53" },
  { "date": "2026-09-11", "start": "20:53", "end": "21:19" }
]
```

## 📊 Retrospective

- **Actual total:** 1h 16m (50m + 26m)
- **vs optimistic:** −10h 44m
- **vs pessimistic:** −22h 44m

**Justification:** The tracked time is far under estimate because the original 12h/24h estimate
was for the issue's full, unsplit scope (Receipts, Opening Balance, Stock Out, Stock Movement
evidence, the weighted-average-cost blend, price lists, dishes/extras, cash, payroll, reports —
see [TD-05](https://github.com/pakodiazdev/sushigo/blob/main/doc/decisions/td-05-monetary-precision-and-rounding.md)
and this issue's original Implementation Scope). Partway through, that scope was deliberately
narrowed to Phase 1 — the `Money`/`Decimal` primitives, the field inventory/ADR, and the concrete
Purchase Receipt DTO/calculation finding — with everything else split into
[#621](https://github.com/pakodiazdev/sushigo/issues/621) rather than attempted as one
higher-risk change against a real production financial system (see the "Scope split" section
above and PR #622's `## 🤔 Assumptions`). The tracked time reflects only Phase 1's real,
much-smaller surface: two value objects, one DTO/service/request migration, one TypeScript
helper, and the field-inventory documentation.

The second session (26m) covers one Codex review cycle on PR #622: Codex found two real P2
defects — `Decimal::of()` expanding scientific notation through an unsafe `(float)` cast (able to
overflow to `INF` and crash `bccomp()`), and the webapp's Receipt form still accepting 4 decimal
digits after the backend narrowed to 2 — both fixed, tested, and the threads resolved before
close-out.

Estimate variance like this is itself useful signal for #621: its own 10h/20h estimate should be
weighed against how much of #415's original 12h/24h band Phase 1 actually consumed (a small
fraction), not assumed to be similarly generous.







