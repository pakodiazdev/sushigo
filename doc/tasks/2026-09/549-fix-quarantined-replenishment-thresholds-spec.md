# 🧪 Fix quarantined Cypress spec: replenishment-thresholds.cy.ts

**Labels:** investment: dev-platform, sprint-7

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/replenishment-thresholds.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Happy-path test fails: an <h4> section title "not visible because clipped by a parent element" (overflow/scroll).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/replenishment-thresholds.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `13m`

### 📅 Sessions
```json
[
  { "date": "2026-09-08", "start": "21:16", "end": "21:29" }
]
```

## 📊 Retrospective
- **Actual total:** 13m (13m)
- **vs optimistic:** −17m
- **vs pessimistic:** −2h47m

**Justification:**
The failure was exactly what the issue described — the `<h4>Replenishment thresholds</h4>` title
sits low on a long page whose scroll container is `<main class="… overflow-y-auto">`
(`code/webapp/src/components/layout/Layout.tsx`), so Cypress's `should('be.visible')` reported it
"clipped by one of its parent elements". The fix is the suite's already-established idiom:
`.scrollIntoView()` before the visibility assertion, matching `vacation-request-approve.cy.ts`,
`attendance-absent-no-record.cy.ts` and `dev-components-catalog.cy.ts`. No product code changed.
It landed well under the optimistic estimate because the diagnosis was one `cypress run` away and
the fix was a one-liner; the bulk of the wall-clock went to booting workspace A's E2E stack and
running the spec three times (fixed → pass, un-fixed → reproduce the clip failure, fixed again),
none of which was rework. CI's own `e2e-ci` shard ran the un-quarantined spec and passed green.


