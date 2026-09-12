# 🧹 Prune redundant StockMovementLine columns with reconciliation

**Labels:** backend, 🔨 technical-debt, investment: product-engineering, sprint-8

## Description

Prune the `StockMovementLine` columns that became duplicated sources of truth after #438 normalized
every `StockMovement` to a single-line contract whose header owns the Variant and base quantity.

This is an explicit Sprint 6 review follow-up from #442 and
`doc/sprints/sprint-006-stock-integrity-and-inventory-completion.md` §15.3/§17.

## Reason

Today the header owns `item_variant_id` and normalized `qty`, while the optional line repeats those
values as `item_variant_id` and `base_qty`. Model guards keep them equal, but duplicated persisted
facts increase write complexity, allow database-level disagreement outside Eloquent, and make the
planned movement ledger contract harder to explain.

The line must continue preserving transaction-UOM and costing/pricing evidence such as operated
`qty`, `uom_id`, conversion factor, unit/sale values, totals, and metadata. This Issue is evidence-
backed pruning, not a blanket deletion of the line.

## Objective

Make the normalized movement header the only persisted source for Variant + base quantity while
preserving every non-redundant transaction and audit value and maintaining lossless rollback.

## Technical Tasks

- [x] Inventory every reader, writer, serializer, test, seeder, factory, OpenAPI schema, frontend
      type, and architecture reference for `stock_movement_lines.item_variant_id` and `base_qty`.
- [x] Verify with real data that each candidate duplicate agrees with its parent header; fail the
      migration with actionable evidence if reconciliation does not hold.
- [x] Decide the final retained line contract explicitly. At minimum preserve operated `qty`,
      `uom_id`, `conversion_factor`, cost/sale evidence, totals, and `meta` unless reconciliation
      proves a field separately redundant.
- [x] Add an additive reconciliation/archive step before destructive schema changes when required.
- [x] Drop only proven-redundant columns, indexes, foreign keys, casts, fillable entries,
      relationships, agreement guards, and request/resource fields.
- [x] Update Opening Balance, Stock Out, Receipt/reversal, #567 posting, planned Transfer, and test
      factories to write the final contract.
- [x] Update webapp `StockMovementLine` types and #574 ledger serialization to derive Variant/base
      quantity from the header.
- [x] Update English/Spanish Inventory architecture and OpenAPI documentation.

## Tests and Migration Evidence

- [x] Migration test reconciles a populated database before dropping anything.
- [x] `up()` and `down()` round-trip preserve all retained audit values exactly.
- [x] A deliberately inconsistent fixture causes a safe, diagnostic failure rather than silent
      data loss.
- [x] Opening Balance, Stock Out, Receipt posting/reversal, shared posting, Transfer, and movement
      ledger regressions stay green.
- [x] Database constraints still enforce the single-line and positive-header-quantity contracts.

## Acceptance Criteria

- [x] Variant and base quantity have exactly one persisted source of truth on `StockMovement`.
- [x] The line retains the original operated quantity/UOM/conversion and all required financial
      evidence.
- [x] No active API, frontend, service, test, seeder, or documentation consumer references a
      dropped field.
- [x] Existing movements remain readable and reversible after migration.
- [x] Rollback restores the previous schema and values without approximation.

## Dependencies and Parallelization

- Depends on #567 and #574 so their final posting/read contracts are known.
- Should land before future physical-count, adjustment, return, or reservation writers begin.
- Owns movement-line schema/model/contracts; it can run in parallel with Inventory UI hardening and
  CI test-isolation work.

## Out of Scope

- Changing movement reasons, lifecycle, reversal semantics, or Stock balances.
- Removing transaction-UOM, cost, sale, profit, or source evidence without separate reconciliation.
- Integer-minor-unit migration (#415).

## Investment Type

`investment: product-engineering`

## Time

- **Optimistic:** `4h`
- **Pessimistic:** `8h`
- **Tracked:** `38m`

```json
[{"date": "2026-09-11", "start": "20:01", "end": "20:39"}]
```

## 📊 Retrospective
- **Actual total:** 0h 38m (38m)
- **vs optimistic:** −3h 22m
- **vs pessimistic:** −7h 22m

**Justification:** The tracked Sessions array only covers the initial `/issue-no-review` session
(research and inventory of every reader/writer/consumer, the reconciliation-migration design, the
full TDD implementation across backend/frontend/docs, and PR creation with CI green) — 38 minutes,
well under even the optimistic estimate, since #438/#567's prior work had already fully isolated the
duplicated columns behind a single model guard and four writer call sites, making the change
mechanical once the inventory was complete. That number understates the real elapsed work, though:
two subsequent rounds of PR review response followed in separate sessions outside this pipeline's
own time tracking (`/pr-comments`, invoked twice) — one round correctly dismissed a P1 finding about
the preview deploy pipeline never running migrations (a pre-existing, systemic gap unrelated to this
issue), the other fixed a real precision bug in the reconciliation check (a float epsilon that could
let a real one-representable-unit disagreement pass undetected) with a new regression test — plus a
`/rebase-main` onto an intervening `main` commit, and an explicit human confirmation on a
rolling-deployment safety tradeoff flagged by a reviewer (kept the single-step column drop as-is
rather than splitting it into an expand-contract release, logged on the PR). None of that
review-response or rebase time is reflected in the `Sessions` array above, since those commands
don't manage this issue's time tracking themselves — a known gap in how session time is captured
across command boundaries, not a sign the task was unusually fast.





