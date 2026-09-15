# 🧪 Fix quarantined Cypress spec: attendance-close-day.cy.ts

**Labels:** investment: dev-platform, sprint-9

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/attendance-close-day.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

"closes the day" test fails: a status <span> "not visible because clipped by a parent element" (overflow/scroll).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/attendance-close-day.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `0h 13m`

### 📅 Sessions
```json
[
  { "date": "2026-09-15", "start": "11:03", "end": "11:16" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 13m (13m; 2026-09-15, 11:03–11:16)
- **vs optimistic:** −0h 17m
- **vs pessimistic:** −2h 47m

**Justification:**
Reproducing the spec against a fresh E2E stack immediately surfaced the real cause: `cy.contains("Salida")` inside the close-day confirmation step was unscoped, so it could resolve to a background employee card's "Salida comida" (lunch check-out) time row instead of the open wizard's own "Salida" summary heading — a genuine ambiguous-selector bug, not overlay/scroll/seed fragility as the original hypothesis guessed. Once the "Cerrar día" button's own `scrollIntoView()` scrolled the page's scrollable `<main>` back up, that background row was the only match still on-screen, so Cypress reported it as "not visible … clipped by a parent element" instead of ever inspecting the fully visible wizard content. Adding a `getCloseDayPanel()` helper to scope the ambiguous `Salida`/`Falta` assertions to the open panel fixed it on the first attempt, verified with three consecutive fresh-stack runs with no flakes — no rework or review cycles were needed to land the fix.


