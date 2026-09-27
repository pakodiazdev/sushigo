# 🧪 Fix quarantined Cypress spec: attendance-lunch-stat-tab.cy.ts

**Labels:** investment: dev-platform, sprint-9

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/attendance-lunch-stat-tab.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

"'En comida' as a tab" test fails: employee name <p> "not visible because clipped by a parent element" (overflow/scroll).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/attendance-lunch-stat-tab.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `14m`

### 📅 Sessions
```json
[
  { "date": "2026-09-26", "start": "18:08", "end": "18:22" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 14m (14m)
- **vs optimistic:** −16m
- **vs pessimistic:** −2h 46m

**Justification:** Delivered unattended via `/issue-no-review` in one session. The failure reproduced
on the first local run (1 of 6 tests: "clicking 'Total empleados' shows literally everyone"). The
failure screenshot confirmed the root cause directly: the "Total" tab renders all 10 employees
`AttendanceTestSeeder` creates, so at the 1280×720 viewport `Mendoza` sits below the fold inside the
scrollable `<main>` panel. This is the exact pattern #535 already fixed on the same page
(`attendance-absent-stat-card.cy.ts`), so the fix was taken directly from that precedent: add
`scrollIntoView()` before each visibility check, assert all 10 seeded employees, and remove the #490
guard. Verification was 3 consecutive local green runs (6/6) plus a green `cypress-e2e-run` on the
draft PR's CI. Most of the tracked time was wall-clock: the local E2E stack boot (its generic
`db:seed` failed in an unrelated `ReceiptService` purchase-receipt seeder, so the E2E Vite server was
started by hand; the spec's own `test:reset` is unaffected) and a ~6-minute CI E2E job. Automated
review (Copilot/Codex) was intentionally left for a human pass per `/issue-no-review`.

