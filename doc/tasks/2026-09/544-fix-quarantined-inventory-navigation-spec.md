# 🧪 Fix quarantined Cypress spec: inventory-navigation.cy.ts

**Labels:** investment: dev-platform, sprint-7

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/inventory-navigation.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

1 of 15 tests fails: a sidebar <a> "not visible" — the consolidated-IA assertion; the 6 nav sub-tests pass.

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/inventory-navigation.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `32m`

### 📅 Sessions
```json
[
  { "date": "2026-09-08", "start": "21:16", "end": "21:48" }
]
```

## 📊 Retrospective
- **Actual total:** 32m (32m)
- **vs optimistic:** +2m
- **vs pessimistic:** −2h 28m

**Justification:**
Landed essentially on the optimistic estimate. The root cause was exactly one of the candidates the
Hypothesis listed — a missing `scrollIntoView()`. The consolidated-IA test asserted `.should('be.visible')`
on every `Inventario` sidebar link, but the `<nav>` in `Sidebar.tsx` is `overflow-y-auto`; with the
group expanded (10 sub-items + 8 top-level entries) the lower links sit outside the scroll viewport at
1280×720, and Cypress does not auto-scroll for a visibility assertion the way it does before an action
command — which is why the 8 per-link nav sub-tests (each a `.click()`) already passed. Fix: scroll each
target into view before asserting. The `this.skip()` quarantine guard from #490 was removed.

Time beyond the one-line fix went to verification: three local spec runs against a freshly-booted
`sushigo-d` E2E stack. Bare local runs (`retries=0`, Cypress's 4 s default timeout) surfaced additional
transient bounce-to-`/login` flakes under the machine's parallel-workspace load, none of which are the
documented bug; re-running with the exact CI config (`retries=2` + extended timeouts, what `_e2e-ci.yml`
uses) was 15/15 green with zero retried attempts. CI then confirmed it: `e2e-ci / cypress-e2e-run` passed
with the spec re-included. Left the `loginByApi` + `visitWithAuth` auth strategy untouched rather than
rewrite it speculatively on non-representative local signal.


