# 🐛 Prevent concurrent stock overselling and enforce balance invariants

## Description

Make every Stock mutation safe under concurrent requests and enforce the balance rules at application and database boundaries.

## Reason

StockOut currently reads availability and decrements later without a row lock. Two requests can approve the same balance and oversell. Receiving can also race while creating the first Location+Variant row.

## Objective

Guarantee atomic Stock creation/mutation and explicit nonnegative on-hand/reserved invariants for existing and future receiving, reservation and transfer flows.

## ✅ Technical Tasks

- [x] Define the allowed balance policy, including whether explicit adjustments may cross zero.
- [x] Use row locks or equivalent atomic mutation for stock-out and reusable Stock mutation services.
- [x] Handle concurrent first-row creation under the unique Location+Variant constraint.
- [x] Enforce on_hand ≥ 0, reserved ≥ 0 and reserved ≤ on_hand at the appropriate database/application layers.
- [x] Keep movement creation and balance mutation in the same transaction.
- [x] Add deterministic concurrent-request and rollback regression tests.

## 🎯 Acceptance Criteria

- [x] Two concurrent outbound requests cannot consume the same available units.
- [x] Concurrent receipt/create paths cannot duplicate or lose a Stock row.
- [x] Invalid balances are rejected even outside HTTP FormRequest validation.
- [x] A failed movement leaves both Stock and movement history unchanged.

## 🔗 References

- Current StockOutService and OpeningBalanceService
- Authorization correction: #400

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `8h` · **Tracked:** `6h55m`

### 📅 Sessions
```json
[
  { "date": "2026-08-12", "start": "20:23", "end": "23:34" },
  { "date": "2026-08-13", "start": "16:54", "end": "18:32" },
  { "date": "2026-08-13", "start": "20:55", "end": "23:01" }
]
```

## 📊 Retrospective

**Actual total:** 6h55m across three sessions (2026-08-12 20:23–23:34; 2026-08-13 16:54–18:32;
2026-08-13 20:55–23:01)
- Session 1: 3h11m — context/plan, TDD implementation (migration, `StockMutationService`,
  `Stock` model guards, `StockOutService`/`OpeningBalanceService` refactor, full test suite),
  docs/checklist, PR open, CI gate, Copilot review response cycle, commit squash, Devin/DeepWiki
  review response cycle, close-out.
- Session 2: 1h38m — a further public review pass (`chatgpt-codex-connector`) on the still-open
  PR flagged that the `NOT VALID` balance constraints added in Session 1 were never repaired or
  validated against pre-existing rows, so the advertised invariant wasn't actually guaranteed for
  data already in the table. Fixed with a clamping `UPDATE` plus `VALIDATE CONSTRAINT` for all
  three constraints, verified with the targeted test suite and Pint, then replied to and resolved
  the thread.
- Session 3: 2h6m — final PR close-out: pre-flight re-validation (review threads, mergeable
  state), branch squash, and this issue's own finalization/retrospective update.

**Variance vs. estimate:** 2h55m over the 4h optimistic estimate, 1h5m under the 8h pessimistic
estimate.

**Narrative:** Landed under the pessimistic estimate but over the optimistic one, driven mainly by
a third review cycle that arrived after the issue had already been finalized once (Session 1). The
implementation itself (DB CHECK constraints, `StockMutationService`, guarded `Stock` model methods,
refactoring both `StockOutService` and `OpeningBalanceService` to route through it, plus 45
new/updated tests) matched the estimate's assumption of a contained, well-scoped concurrency fix —
no reservation/transfer flow existed yet to build around, which kept the diff to the two existing
services plus the shared safety layer. Session 1's two review cycles added real but modest time:
Copilot's first pass found a genuine gap (the `reserved <= on_hand` guard on `decreaseOnHand` only
checked for negative `on_hand`, not for dropping below `reserved`) plus a docblock inaccuracy —
both fixed with a small commit and matching test. Devin's DeepWiki pass then surfaced two
"Investigate"-severity design points worth acting on (the migration would fail on any pre-existing
row already violating the invariant — fixed by adding the CHECK constraints as `NOT VALID`; and
`receiveInto()`'s original optimistic-INSERT-first design made the doomed-write path the *common*
case for routine repeat receipts — restructured to check for an existing row first, moving the
race-recovery logic into a separately-testable `insertOrRecoverFromRace()`), plus a genuine
input-validation gap (non-positive quantities could silently invert a mutation, which the model
guards now reject) and a vacuous test assertion (missing `->fresh()` on a DB-computed column,
mirroring a fix already applied elsewhere in this same PR). All four were fixed with matching
test coverage; the two remaining Informational flags (exception-message detail exposure — matches
an existing codebase-wide pattern; a very narrow `ModelNotFoundException` edge case requiring a
zero-stock row to be deleted in the exact microsecond window of an unrelated receive race) were
evaluated and left as-is with reasoning recorded, not fixed, since neither represents a real
regression or a reachable defect worth the added complexity. Devin's own live re-scan of the final
Session 1 commit did not finish within a reasonable window (free-tier scan appeared to stall) — the
fixes were still applied and tested based on its prior findings, and CI (including the full
1322-test Feature suite) stayed green throughout. What Session 1 could not anticipate was that the
`NOT VALID` fix itself would draw a *further* finding: adding a constraint `NOT VALID` stops future
violations but silently leaves any row that already violates it uncorrected and unvalidated,
meaning the invariant this issue set out to guarantee wasn't actually true for existing data. That
gap — caught by a fourth, independent reviewer after the PR had already gone through two rounds and
been marked complete — is exactly the kind of thing a contained unit of review cycles can miss, and
justifies the extra session rather than reflecting scope creep in the original implementation.

