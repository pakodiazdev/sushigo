# 🐛 Unify weighted-average acquisition cost across Variant, Stock and reports

**Labels:** bug, backend, sprint-5, investment: product-engineering

## Description

Establish and migrate to one authoritative weighted-average acquisition-cost model.

## Reason

OpeningBalance currently updates ItemVariant.avg_unit_cost while stock reports value Stock.weighted_avg_cost. The two sources can diverge and produce incorrect inventory valuation and margins.

## Objective

Choose the correct cost scope, centralize exact-decimal calculation and make receipts, stock queries and reports use the same reconciled source.

## ✅ Technical Tasks

- [x] Decide/document whether weighted-average cost is global per Variant or maintained per Inventory Location.
- [x] Inventory every reader/writer of Variant and Stock cost fields.
- [x] Centralize receipt/opening/adjustment cost calculation using exact decimal arithmetic.
- [x] Migrate/backfill existing data with reconciliation evidence and rollback plan.
- [x] Update reports/resources/services and remove active use of the losing source.
- [x] Add weighted-average, zero-stock, multi-location and reconciliation regression tests.

## 🎯 Acceptance Criteria

- [x] One source of truth is documented and used by every new receipt and valuation query.
- [x] Existing balances reconcile before legacy fields are dropped.
- [x] The Product/Variant catalog remains read-only for acquisition cost.
- [x] No float-based rounding changes monetary inventory totals unexpectedly.

## 🔗 References

- Depends on the receipt design in #432
- Current inconsistency exists between ItemVariant.avg_unit_cost and Stock.weighted_avg_cost

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `8h` · **Tracked:** `1h 18m`

### 📅 Sessions
```json
[
  { "date": "2026-08-25", "start": "17:53", "end": "19:11" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 18m (78m, single session)
- **vs optimistic:** −2h 42m
- **vs pessimistic:** −6h 42m

**Justification:** The scope decision this issue's Technical Tasks asked for turned out to already
be answered by prior work: #432's merged `ReceiptService` (and its architecture doc) already wrote
to `Stock.weighted_avg_cost` per Inventory Location and explicitly deferred "reconciling this
against `OpeningBalanceService`'s divergent Variant-level write" to this issue — so the hardest
design question (global vs. per-location) was research, not a fresh decision, which is most of
why this landed well under even the optimistic estimate. Implementation was mechanical once that
was settled: centralize the blend formula, repoint the two writers and one reader, backfill the
stale field, document it.

Most of the tracked time was actually review-response, not first-pass implementation. The initial
TDD pass (calculator, Stock/OpeningBalanceService/StockOutService/ReceiptService rewiring,
reconciliation migration, docs, tests) was fast, but the automated review loop this run went
through (per the user's standing request, this workflow now defaults to `/issue-no-review`
instead) caught three real Copilot findings (undeclared `ext-bcmath` dependency, float division in
the reconciliation migration, a flaky strict float comparison in a test) and three real Codex
findings — including a genuine P1: the reconciliation migration would have zeroed out valuation
for every pre-existing Opening-Balance-only Stock row once `StockOutService`/reports switched to
reading `Stock.weighted_avg_cost`, since that flow never wrote to `Stock` before this PR. Fixing
that (a legacy-cost seeding pass) plus two P2s (an explicit `unit_cost: 0` not blending, and
`stock-out-form.tsx`'s profit preview still reading the frozen catalog field) each meant a fix,
new tests, a commit, a push, and a fresh CI run — real time, and exactly the kind of defect this
review loop exists to catch before merge rather than after.


