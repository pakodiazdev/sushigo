# 🧪 Fix quarantined Cypress spec: suppliers-catalog.cy.ts

**Labels:** investment: dev-platform, sprint-8

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/suppliers-catalog.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Test "creates, edits, and deactivates a supplier offering" fails: after an action a <select> is expected to reset to "Selecciona una variante" but still shows the previously chosen variant (suppliers-catalog.cy.ts:169). The other test in the file passes.

It was **quarantined** as part of #490 (a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility, not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Likely a stale `<select>` reset expectation or a missing wait after the offering mutation.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/suppliers-catalog.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `19m`

### 📅 Sessions
```json
[
  { "date": "2026-09-10", "start": "01:47", "end": "02:06" }
]
```

## 📊 Retrospective
- **Actual total:** 19m (19m)
- **vs optimistic:** −11m (under)
- **vs pessimistic:** −2h 41m (under)

**Justification:** The tracked session covered diagnosis (isolating the failure to the backend's
`is_active` boolean validation rather than a flaky `<select>` reset) and the initial fix — adding
`ListVariantsRequest` and removing the quarantine guard. Two follow-up review rounds happened after
this session closed but were not logged as separate tracked sessions: a Codex finding that an
unsupported `is_active` value (e.g. `garbage`) was silently swallowed into an unfiltered list
instead of a 422, and a manually-reported finding that the FormRequest conversion had reversed the
endpoint's not-found-before-validation-error precedence for an unknown product id. Both were fixed,
tested, and the branch was rebased onto `main` before closing.

