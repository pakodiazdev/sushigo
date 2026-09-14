# 🧪 Fix quarantined Cypress spec: schedule-indefinite-summary.cy.ts (CI-only)

**Labels:** investment: dev-platform, sprint-8

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/schedule-indefinite-summary.cy.ts` fails **only in CI** (the new `cypress-e2e` workflow — Chromium + a from-scratch Docker stack). Where it was runnable locally (`make cypress-run WORKSPACE=sushigo-b`, Electron) it **passed**.

CI-only (passes locally): an <h3> section title is "not visible" after 15s (schedule-indefinite-summary.cy.ts:69) — overlay/scroll fragility that only reproduces on the fresh CI stack.

It was **quarantined** as part of #490 (a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset. This issue tracks fixing it and removing the guard.

## 💡 Hypothesis

CI-only discrepancy — a Chromium-vs-Electron behaviour difference (file upload / dialog lifecycle / overlay) or a fresh-stack seed/timing gap. Not reproducible on the local dev-lab stack, so debug from the CI artifacts (`cypress-screenshots-shard-*`, `e2e-docker-logs-shard-*`) or by running the E2E stack against a freshly-migrated `mydb_e2e`.

## 🔁 Reproduction guide

1. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/schedule-indefinite-summary.cy.ts`
2. Push and let the `cypress-e2e` workflow run it on a shard
3. Observe the failure above; download that shard's screenshot + docker-log artifacts

**Done when:** the spec passes reliably in CI, the guard is removed, and `cypress-e2e` is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `4h`
- **Tracked:** `1h 16m`

### 📅 Sessions
```json
[
  { "date": "2026-09-13", "start": "19:25", "end": "20:41" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 16m (76m; 2026-09-13 19:25–20:41)
- **vs optimistic:** +0h 16m
- **vs pessimistic:** −2h 44m

**Justification:**
The CI-only failure required inspecting screenshot artifacts and checking cold-cache local runs because the existing local setup passed. An initial Vite warm-up hypothesis added an extra iteration before the screenshots identified scroll overshoot behind the fixed panel header. Scrolling directly to the asserted schedule text fixed the failure; the subsequent Codex review removed the non-retriable navigation warm-up, with two further cold-cache runs reported green. This diagnosis and review cycle explains the modest overrun against the optimistic estimate while remaining below the pessimistic estimate. The total reflects the recorded session only.


