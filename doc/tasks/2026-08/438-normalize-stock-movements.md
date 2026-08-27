# 🔨 Normalize Stock Movements and add immutable compensating reversals

**Labels:** backend, 🔨 technical-debt, sprint-6, investment: product-engineering

## Description

Normalize the Stock Movement contract and implement auditable reversal through compensating movements.

## Reason

StockMovement and StockMovementLine duplicate Variant and quantity fields, so header and lines can disagree. A REVERSED constant exists without a complete immutable reversal workflow.

## Objective

Choose one consistent line model, enforce valid lifecycle/source/destination rules and preserve every posted correction as append-only evidence.

## ✅ Technical Tasks

- [x] Decide and migrate the single-line versus multi-line movement contract.
- [ ] Remove contradictory Variant/quantity duplication between header and lines.
- [x] Make posted movements immutable and non-deletable.
- [x] Implement compensating reversal with original/reversal linkage, user, timestamp and reason.
- [x] Enforce positive quantities, location rules and valid status transitions.
- [x] Update services/resources/Swagger and add lifecycle, reconciliation and audit tests.

## 🎯 Acceptance Criteria

- [x] Header and lines cannot express different moved quantities or Variants.
- [x] Posted history is never edited or deleted to correct a mistake.
- [x] Reversal restores the affected balance exactly once and remains causally linked.
- [x] Invalid status/source/destination combinations fail atomically.

## 🔗 References

- Depends on #430

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `6h` · **Pessimistic:** `12h` · **Tracked:** `2h45m`

### 📅 Sessions
```json
[
  { "date": "2026-08-26", "start": "21:04", "end": "21:37" },
  { "date": "2026-08-26", "start": "23:35", "end": "23:58" },
  { "date": "2026-08-27", "start": "09:05", "end": "10:54" }
]
```

## 📊 Retrospective

- **Actual total:** 2h 45m (165m) across three sessions — 33m implementation (2026-08-26 21:04–21:37), 23m automated-review response (2026-08-26 23:35–23:58), 1h 49m SonarCloud cleanup + flaky-CI diagnosis + rebase + close-out (2026-08-27 09:05–10:54). Sessions 2 and 3 were driven by follow-up commands (`/pr-comments`, `/sonar-review`, `/rebase-main`, `/finish-pr`) rather than `/start-issue`, so their start/end boundaries are approximate.
- **vs optimistic (6h):** −3h 15m
- **vs pessimistic (12h):** −9h 15m

**Justification:**
The implementation itself came in well under the optimistic estimate. The domain was already
well-mapped by the exploration phase — every `StockMovement`/`StockMovementLine` consumer is one of
three inventory services, all single-line, so the "decide single-line vs multi-line" fork resolved
quickly to *single-line, header-authoritative, non-destructive* (the physical removal of the now-
redundant duplicate columns is deferred to #442 per the Sprint 006 sequencing, which is why one
Technical Task box is deliberately left unchecked). TDD on the contract guards, the
`StockMovementReverser`, and the linked receipt-reversal path was straightforward and landed 25
passing tests with the model-event guards working on `saving` (a `booted()`-registered `creating`
listener never fires here — `HasPublicId` halts the `creating` event first).

Most of the wall-clock — and the entire overrun past the raw implementation time — was the
review/hardening iteration, not the feature:
- **Automated review (session 2):** Codex flagged one real P1 (receipt reversal could create an
  unlinked second compensation if the movement was already reversed via the shared reverser) and one
  P2 (a posted line could be reparented onto a draft movement to slip past the immutability guard);
  Copilot flagged the same P1 plus inline-FQCN style. All five threads were genuine — no false
  positives, no business-rule disputes — and each got a fix plus a regression test.
- **SonarCloud (session 3):** three code smells on new code (a 22-method model class, and two
  functions over the cognitive-complexity limit). Fixed by extracting the lifecycle/invariant
  machinery into an `EnforcesStockMovementContract` trait, removing three dead helper methods, and
  splitting `assertContractInvariants()` and `reverseReceipt()`. That refactor then surfaced a
  latent cross-test transaction-poisoning fragility in the *payroll* suite (a `ConfirmClose` /
  `ReclosePayPeriod` test failing with "0 is greater than 0" behind an aborted-transaction cascade)
  — non-deterministic (different victim/constraint/shard each run, `main` consistently green, local
  full inventory+payroll run of 1172 tests green, and each failed shard passed clean on re-run). It
  was mitigated defensively — the single-line and single-reversal contracts are now enforced at the
  application layer *before* the INSERT, so no test trips the raw DB constraint that starts the
  cascade — but the underlying payroll test-isolation bug is pre-existing and out of scope here;
  it warrants its own issue.
- **Rebase:** #439 (per-location replenishment thresholds) merged to `main` mid-flight, touching the
  same architecture docs; the rebase was clean (git auto-merged the two additive doc edits).

Every review cycle found something real or correctly deferred, so none of the time was spent
chasing noise — the second- and third-order correctness of an append-only ledger contract simply
took more verification passes than the first green build.





