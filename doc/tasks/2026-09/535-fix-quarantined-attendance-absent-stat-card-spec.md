# 🧪 Fix quarantined Cypress spec: attendance-absent-stat-card.cy.ts

**Labels:** investment: dev-platform, sprint-8

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/attendance-absent-stat-card.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Two "Stat cards as tabs" tests fail: employee name <p> "not visible because its content is being clipped by a parent" (overflow/scroll).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/attendance-absent-stat-card.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `18m`

### 📅 Sessions
```json
[
  { "date": "2026-09-13", "start": "19:26", "end": "19:44" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 18m (18m)
- **vs optimistic:** −12m
- **vs pessimistic:** −2h 42m

**Justification:** The logged session (18m) covered diagnosing and fixing the root cause on the
first pass — the failure was a missing `scrollIntoView()` before checking visibility on employee
cards that can render below the fold once all 10 seeded employees show (the "Total" tab and the
broad default view), the same pattern already established in every other attendance Cypress spec
(`attendance-checkin.cy.ts`, `attendance-lunch-start.cy.ts`, etc.), so no exploratory rework was
needed.

Two rounds of PR review (`chatgpt-codex-connector`, addressed via `/pr-comments`) surfaced
additional scope not captured in a logged session: a stale sprint-evidence row left `⏳ "not
started"` on a commit that had actually implemented and validated the fix, and a test that only
asserted 5 of the 10 seeded employees rather than the full grid the issue's own hypothesis pointed
at. A `/rebase-main` was also needed against three other quarantined-spec PRs (`#553`, `#554`,
`#577`) that merged into `main` and touched the same shared sprint document concurrently. None of
that review-response or rebase work was tracked as a formal session — consistent with how prior
sibling issues in this same sprint (e.g. `#545`) have handled it — but it is fully captured in the
PR's commit history and description.



