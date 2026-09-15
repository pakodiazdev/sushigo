# 🧪 Fix quarantined Cypress spec: employee-vacation-entitlement.cy.ts

**Labels:** investment: dev-platform, sprint-9

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/employee-vacation-entitlement.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Happy-path test fails: entitlement <p> is `position: fixed` and "covered by" the blue DevDebugger bar (`<div class="bg-blue-600 ...">`).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/employee-vacation-entitlement.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `1h 17m`

### 📅 Sessions
```json
[
  { "date": "2026-09-15", "start": "12:50", "end": "14:07" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 17m (77m; 2026-09-15, 12:50–14:07)
- **vs optimistic:** +0h 47m
- **vs pessimistic:** −1h 43m

**Justification:**
This one ran well over the optimistic estimate because the reported symptom ("covered by the blue DevDebugger bar") turned out to be a genuine timing race rather than a simple missing-scroll/overlay-dismiss fix, and the standard `cy.closeDevDebugger()` diagnostic pattern needed real instrumentation to pin down: adding temporary mount/toggle counters to `DevDebugger.tsx` and `use-dev-debugger.ts`, and deliberately failing assertions to surface their values, since the debugger's reappearance couldn't be explained by any code path that sets its hidden state. That investigation twice pointed at false leads (a suspected remount via Layout's auth-branch switching, and a suspected HMR/file-watcher artifact from editing source mid-investigation) before landing on the real cause: on a cold stack, this page's first paint lags behind `cy.visitWithAuth()` returning, so `closeDevDebugger()`'s own "close only if already present" guard silently no-ops, and the debugger mounts visible moments later. Fixing that unmasked a second, independent flake (`cy.contains('12')` ambiguously matching the employee header's phone number once it scrolled off-panel) — the same class of unscoped-selector bug already seen in #536 and #537, fixed the same way (scoping to the relevant section). No review cycles were involved; all tracked time is the reproduction, instrumentation, and fix work itself.


