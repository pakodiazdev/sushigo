# 🧮 Reconcile inventory valuation when reversing Purchase Receipts

**Labels:** backend, investment: product-engineering, sprint-8

## Description

Define and implement correct inventory valuation semantics when reversing a posted Purchase
Receipt. This is the highest-priority unresolved finding from the Sprint 5 engineering review.

Today `ReceiptService::reverseReceipt()` removes the received quantity but intentionally leaves
`Stock.weighted_avg_cost` unchanged. The immutable quantity reversal delivered by #438 is correct,
but it did not close the valuation problem.

## Reason

Leaving `Stock.weighted_avg_cost` untouched on reversal produces a stock ledger that is
quantity-correct but value-incorrect, silently corrupting valuation reports, COGS, and any future
accounting integration without ever raising an error. This was flagged as the highest-priority
unresolved finding from the Sprint 5 engineering review, and Sprint 8 Returns work (and broader
inventory valuation/reporting) cannot safely build on top of Receipt reversal until this is fixed.

## Risk Example

```text
100 units @ 10 = value 1,000
receive 100 units @ 20
200 units @ weighted average 15 = value 3,000
reverse that receipt
100 units remain @ 15 = value 1,500 (original value was 1,000)
```

Blindly restoring the previous average is also incorrect if consumption, another receipt, an
adjustment, or a transfer occurred between posting and reversal.

## Objective

Quantity and inventory value remain mathematically reconcilable after a Receipt reversal, with
append-only evidence and deterministic semantics for intervening operations.

## Architecture and Domain Tasks

- [x] Define the authoritative valuation model: value accumulator, immutable valuation movements,
      cost layers, or another evidence-backed design. Document why it remains scalable for
      Receipts, Transfers, Counts, Adjustments, Returns, and future COGS.
- [x] Define immediate reversal, partial remaining quantity, intervening consumption, later Receipt,
      transfer, double/concurrent reversal, and zero-stock semantics.
- [x] Decide which conditions are exactly reversible and which must fail with an actionable `409`
      or post an explicit valuation adjustment; never silently approximate.
- [x] Snapshot or link every value fact needed to reproduce the compensating valuation without
      editing posted history.
- [x] Apply deterministic locking and idempotency with the #567 posting/source identity contract.
- [x] Ensure Transfer cost behavior does not create or destroy total inventory value.
- [x] Expose valuation evidence through the #574 movement ledger without leaking internal IDs.
- [x] Update English/Spanish Inventory and Purchase Receipt architecture plus OpenAPI.

## Required Tests

- [x] Immediate full reversal restores quantity and value exactly.
- [x] Reversal after partial consumption follows the documented boundary.
- [x] Reversal after a second Receipt preserves the value invariant.
- [x] Reversal after a Transfer preserves value across both Locations.
- [x] Concurrent/double retries compensate at most once.
- [x] Zero/free goods and fractional unit costs use the canonical exact-money contract.
- [x] Failed valuation reconciliation rolls back Stock, Receipt state, quantity movement, and value
      evidence atomically.

## Acceptance Criteria

- [x] `sum(on_hand × valuation basis)` and immutable value evidence reconcile after every supported
      reversal scenario.
- [x] No Receipt reversal changes quantity while leaving unexplained residual value.
- [x] Intervening operations have explicit, tested semantics rather than a hidden approximation.
- [x] Posted movement/value history remains append-only and causally linked.
- [x] Concurrency and retry behavior cannot apply quantity or value compensation twice.
- [x] Ledger/UI documentation explains both quantity and valuation effects.

## Dependencies and Parallelization

- Depends on Sprint 7 #567, #573, and #574 contracts.
- Coordinate with #415's exact monetary representation; architecture work can start in parallel,
  but final financial arithmetic must use the canonical primitive.
- Should precede Sprint 8 Returns and broad inventory valuation/reporting features.

## Out of Scope

- Full general-ledger accounting, supplier credit notes/payables, tax filing, or arbitrary historical
  restatement.
- Editing or deleting posted quantity/value evidence.

## Investment Type

`investment: product-engineering`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `8h` · **Pessimistic:** `16h` · **Tracked:** `4h 8m`

### 📅 Sessions
```json
[
  { "date": "2026-09-12", "start": "20:22", "end": "20:28" },
  { "date": "2026-09-12", "start": "20:28", "end": "21:50" },
  { "date": "2026-09-12", "start": "21:50", "end": "23:59" },
  { "date": "2026-09-13", "start": "00:00", "end": "00:20" },
  { "date": "2026-09-13", "start": "00:20", "end": "00:31" }
]
```

## 📊 Retrospective
- **Actual total:** 4h 8m (6m + 82m + 129m + 20m + 11m)
- **vs optimistic:** −3h 52m
- **vs pessimistic:** −11h 52m

**Justification:** Finished comfortably under both estimates despite two full review-response
cycles beyond the initial implementation. The core design (an exact `Stock.total_value` accumulator
maintained alongside the existing rounded `weighted_avg_cost`, read directly at reversal time
instead of reconstructed) was arrived at directly during the first session by researching the
existing weighted-average-cost architecture (`WeightedAverageCostCalculator::blend()`,
`Stock::applyWeightedAverageCost()`) and the already-existing derived `total_value` concept in
`AssignmentAwareStockProjection`, which meant the bulk of the Required Tests and Acceptance Criteria
were satisfiable without extensive rework. Two follow-up rounds added real time: a Codex review
caught a genuine rounding-compounding defect in the first cut (reconstructing prior value from the
already-rounded `weighted_avg_cost` column instead of an exact accumulator), which required
introducing the persisted `total_value` column and its migration; a second manual review pass then
found five more edge cases in that same accumulator (a migration overflow at extreme values, a
full-depletion negative-value case, a forward-blending rounding-compounding case symmetric to the
original reversal bug, a generic-reverser bypass of the new valuation logic, and a nullable-cost
serialization bug) — each fixed with its own direct regression test and re-verified against the
full 2,620-test suite twice. No scope changes were requested; the extra time was entirely
review-response depth, which is the expected cost of a change this central to inventory valuation.




