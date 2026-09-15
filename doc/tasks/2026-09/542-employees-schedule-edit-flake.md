# 🧪 Fix quarantined Cypress spec: employees.cy.ts

**Labels:** investment: dev-platform, sprint-9

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/employees.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

"Editar horario activo" test fails: content 'Editar' never found inside the edit <dialog> (dialog content / selector).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/employees.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `2h 13m`

### 📅 Sessions
```json
[
  { "date": "2026-09-15", "start": "14:10", "end": "16:23" }
]
```

## 📊 Retrospective
- **Actual total:** 2h 13m (133m; 2026-09-15, 14:10–16:23)
- **vs optimistic:** +1h 43m
- **vs pessimistic:** −0h 47m

**Justification:**
This one ran well past the optimistic estimate, and even close to the pessimistic bound, mainly because of the file's own size and end-to-end weight: `employees.cy.ts` has 5 tests across 4 describe blocks, including a full employee-creation flow with UI form filling and a real password-reset email round trip (`test:getResetLink`), each run taking close to a minute. Isolating the failing "Editar horario activo" test alone (via `@cypress/grep`) passed cleanly, which first suggested a pure selector/timing bug — but running the full file reproduced the real failure, and reading `schedule-dialog.tsx`'s `renderEditButton()` showed it was actually a genuine cross-test state dependency: an earlier test in the same file schedules a future work-schedule version for EMP-001, which by design closes its currently active schedule and hides the "Editar" button for it. The fix (switching the test to an employee no other test in the file touches) was simple once found, but confirming it needed the full 5-test file re-run three times over for reliability, at ~1 minute per run. No review cycles were involved.


