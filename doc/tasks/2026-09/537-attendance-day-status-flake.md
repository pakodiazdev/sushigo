# 🧪 Fix quarantined Cypress spec: attendance-day-status.cy.ts

**Labels:** investment: dev-platform, sprint-9

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/attendance-day-status.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

"Justificar Falta" test fails: `[data-testid='btn-mark-falta']` never found inside García, María's card (data/flow or selector).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/attendance-day-status.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `0h 8m`

### 📅 Sessions
```json
[
  { "date": "2026-09-15", "start": "12:41", "end": "12:49" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 8m (8m; 2026-09-15, 12:41–12:49)
- **vs optimistic:** −0h 22m
- **vs pessimistic:** −2h 52m

**Justification:**
Reproducing the spec against a fresh E2E stack surfaced two distinct, stackable defects rather than the overlay/scroll/seed fragility the original hypothesis guessed. First, the "Justificar Falta" test independently re-marks García, María as Falta, but the file-level `before()` only seeded the DB once for the whole file, so her card no longer had a "Marcar falta" button by the time that second test ran (the first test had already consumed it) — fixed by moving the seed into `beforeEach()`, the same retries=2-safe pattern already established in #554. Fixing that unmasked a second flake: `useRegisterLeaveDialog()` calls `useLeaveTypes()` un-gated by `isOpen`, so the `GET /leave-types` request actually fires once at page mount (every card's hidden dialog shares the same React Query key), not when the "Registrar ausencia" dialog opens — the test's mid-flow `cy.intercept()` was racing an already-completed request. Moving that intercept into the shared `beforeEach`, before the page visit, fixed it. No rework or review cycles were needed; both fixes landed on the first attempt, verified with three consecutive fresh-stack runs with no flakes.


