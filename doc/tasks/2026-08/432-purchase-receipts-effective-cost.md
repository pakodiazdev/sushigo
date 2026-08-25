# ✨ Receive purchased Product Presentations and calculate effective unit cost

**Labels:** enhancement, backend, sprint-5, investment: product

## Description

Implement Purchase Receipts whose immutable lines snapshot package conversion and compute the effective acquisition cost per base unit.

## Reason

Cost is determined by the actual transaction: supplier, presentation, paid and bonus packages, discounts, freight/expenses and non-recoverable taxes. It must not be entered on Product or Variant.

## Objective

Post authorized receipts atomically into Stock and auditable movements while preserving all evidence needed to reproduce acquisition cost.

## ✅ Technical Tasks

- [x] Add receipt header/line schema, public IDs, supplier, destination location, references, dates and draft/posted/reversed lifecycle.
- [x] Capture paid/ordered, physically received and bonus package quantities.
- [x] Snapshot presentation factor, gross amount, discounts, allocated expenses, non-recoverable taxes and net acquisition amount.
- [x] Calculate base units received and effective acquisition cost using exact decimals.
- [x] Posting creates immutable movement evidence and updates Stock inside one transaction.
- [x] Add idempotency, authorization, reversal boundary, Swagger and comprehensive feature/concurrency tests.

## 🎯 Acceptance Criteria

- [x] A Box x24 receipt posts exactly 24 base pieces per received box using the snapshotted factor.
- [x] Bonus packages reduce effective per-unit cost without changing the presentation factor.
- [x] Posted evidence reproduces net amount, received base units and acquisition unit cost.
- [x] Duplicate/concurrent posting cannot apply the same receipt twice.
- [ ] No receipt can access a destination outside the user's authorized operating scope once that policy lands.

## 🔗 References

- Depends on #431 and #430

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `7h` · **Pessimistic:** `13h` · **Tracked:** `8h 46m`

### 📅 Sessions
```json
[
  { "date": "2026-08-25", "start": "02:06", "end": "10:52" }
]
```

## 📊 Retrospective
- **Actual total:** 8h 46m (526m, single session)
- **vs optimistic:** +1h 46m
- **vs pessimistic:** −4h 14m

**Justification:** The tracked session covers the initial autonomous TDD implementation — the
`receipts`/`receipt_lines` schema, `ReceiptService`'s atomic post/reverse reusing #430's
`StockMutationService` lock/race pattern, the full CRUD + post/reverse API surface, permissions,
Swagger, architecture docs, and the original 22 feature/concurrency tests — through to CI going
green. That run was interrupted five separate times mid-flight by session-limit resets and the host
machine sleeping; each time it was resumed from its saved progress rather than restarted, so none of
that was rework, but it did add real wall-clock time inside the tracked session. The session ended,
by design, once CI was green and 11 unresolved Copilot/Codex review threads made `/finish-pr` stop
per this project's zero-interruption/no-auto-review-resolution contract for `/issue-no-review`.

The subsequent review-response work — addressing all 11 threads (soft-deleted-reference validation
gaps, an offering/supplier/presentation cross-check, a negative-net-amount guard, a destination
soft-delete race at posting time, a delete/post concurrency race, and a migration-rollback fix), two
SonarCloud passes (a Cognitive Complexity violation introduced by the thread fixes), and one directly
relayed finding (`destinationLocation()` missing `->withTrashed()`, losing audit evidence once a
receipt's location is deleted) — happened across separate `/pr-comments` and `/sonar-review`
invocations in later interactive turns. Per this project's Sessions convention, only
`/start-issue`-family commands open a Sessions entry; those follow-up commands do not, so that time
is real but isn't reflected in the `8h 46m` figure above. Every finding in that phase was a genuine
correctness or race-safety defect (not a business-rule dispute) and was fixed with its own test.





