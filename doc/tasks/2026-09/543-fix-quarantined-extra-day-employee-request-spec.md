# 🧪 Fix quarantined Cypress spec: extra-day-employee-request.cy.ts

**Labels:** investment: dev-platform, sprint-9

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/extra-day-employee-request.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Happy-path test fails: `cy.click()` on a button "covered by another element" (overlay/toast).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/extra-day-employee-request.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `12m`

### 📅 Sessions
```json
[
  { "date": "2026-09-27", "start": "18:01", "end": "18:13" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 12m (12m)
- **vs optimistic:** −18m
- **vs pessimistic:** −2h 48m

**Justification:** Delivered unattended via `/issue-no-review` in one session. The spec hid **two**
stale-test problems behind each other, neither a product regression:
1. The quarantine symptom ("`cy.click()` covered by another element") was the Dev Debugger overlay,
   not a toast. `beforeEach` called `cy.closeDevDebugger()` right after navigation; that helper only
   acts if the overlay is already in the DOM, so it no-oped and the panel stayed on top of the
   request card's "Cancelar" button. Fixed by waiting for the "Día extra" button first, the same
   pattern `attendance-lunch-stat-tab.cy.ts` documents.
2. Once the click went through, the post-cancel assertion waited for
   `No tienes solicitudes de días extra.` — text that no longer exists since #096 (`af04e398`)
   generalized "Mis solicitudes" to every request type (`No tienes solicitudes.`). The cancel itself
   worked (PATCH 200, card gone); only the selector was stale.
Each was diagnosed from the Cypress failure screenshot in one iteration, which kept the total well
under the optimistic estimate. Verified with 3 consecutive local green runs and a green
`cypress-e2e-run` on the draft PR. Automated review (Copilot/Codex) was intentionally left for a
human pass per `/issue-no-review`.

