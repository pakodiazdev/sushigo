# 🧪 Fix quarantined Cypress spec: schedule-history.cy.ts (CI-only)

**Labels:** investment: dev-platform, sprint-9

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/schedule-history.cy.ts` fails **only in CI** (the new `cypress-e2e` workflow — Chromium + a from-scratch Docker stack). Locally (`make cypress-run WORKSPACE=sushigo-b`, Electron) it **passes**.

CI-only (passes locally on Electron): an <h3.flex.items-center.gap-2.text-sm.font-semibold> section heading is "not visible" after 15s (schedule-history.cy.ts) — same overlay/scroll signature as #553, only reproduces on the fresh CI stack under Chromium.

It was **quarantined** as part of #490 (a `before(function () { this.skip() })` guard at the top of the file) so the `cypress-e2e` CI quality gate can go green on the stable subset. This issue tracks fixing it and removing the guard.

## 💡 Hypothesis

Same family as #553 — an `<h3>` section heading inside a scrollable panel is off-screen / clipped when Cypress asserts visibility. Under Chromium on the CI stack the panel likely renders at a different scroll position or height. Needs a `scrollIntoView()` / a more specific wait, or the section may genuinely not render on a fresh DB.

## 🔁 Reproduction guide

1. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/schedule-history.cy.ts`
2. Push and let `cypress-e2e` run it on a shard; download that shard's screenshot artifact
3. Observe the `<h3>` "not visible" failure

**Done when:** the spec passes reliably in CI, the guard is removed, and `cypress-e2e` is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `45m`
- **Pessimistic:** `3h`
- **Tracked:** `1h 3m`

### 📅 Sessions
```json
[
  { "date": "2026-09-15", "start": "16:25", "end": "17:28" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 3m (63m; 2026-09-15, 16:25–17:28)
- **vs optimistic:** +0h 18m
- **vs pessimistic:** −1h 57m

**Justification:**
Slightly over the optimistic estimate because this issue's own hypothesis pointed straight at the fix — the `<h3 className="flex items-center gap-2 text-sm font-semibold">` signature and "not visible" symptom exactly match #553, already fixed with a known-good pattern (scroll to the actual next interactive target instead of a separate heading check). The extra time went into trying to actually reproduce the CI-only failure locally, first under Electron then under Chrome, to verify the fix empirically rather than by pattern-matching alone — neither reproduced it, confirming the issue's own note that this only manifests on a genuinely fresh CI Docker boot. The fix was applied as the most literal reading of "same family as #553," and the real confirmation came from this PR's own `cypress-e2e` CI run passing under the exact Chromium/fresh-stack conditions that were failing before. No review cycles were involved.


