# 🧪 Fix quarantined Cypress spec: item-media-gallery-uploader.cy.ts

**Labels:** investment: dev-platform, sprint-8

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/item-media-gallery-uploader.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Happy-path test fails: toast 'Item created successfully' never appears — the create+media-gallery flow does not complete.

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/item-media-gallery-uploader.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `33m`

### 📅 Sessions
```json
[
  { "date": "2026-09-10", "start": "01:50", "end": "02:23" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 33m (33m)
- **vs optimistic:** +3m
- **vs pessimistic:** −2h 27m

**Justification:** The logged session (33m) covered diagnosing and fixing the original hypothesis correctly on the first pass — the flake was a real submit-button race (`Create Item` clicked while `MediaGalleryUploader`'s busy state was still settling), not the generic UI fragility the issue's `Hypothesis` section had guessed at, so no exploratory rework was needed there.

Two rounds of PR review (`chatgpt-codex-connector`, addressed via `/pr-comments`) surfaced additional scope not captured in a logged session: a P2 finding that the fixed SKU literal would collide with itself on a Cypress `retries=2` rerun (fixed by regenerating the SKU per attempt), and a P1 finding that `e2e-ci` failed on a second, unrelated defect — `generateOwnerToken()` throwing because `crypto.randomUUID` is unavailable on CI's non-secure `http://test_e2e:5173` origin. The second fix (a Chrome secure-context exemption in `cypress.config.ts`) was a deliberate scope expansion — initially the PR was left as "not mergeable yet, needs a human decision" — a human reviewer explicitly directed resolving it within this PR rather than deferring to a separate ticket, since no dedicated issue existed for that root cause. That review-response work was not tracked as a formal session, so it is not reflected in the Tracked total above, but is captured in the PR's commit history and description.


