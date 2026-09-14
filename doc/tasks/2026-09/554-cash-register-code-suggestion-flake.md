# 🧪 Fix quarantined Cypress spec: cash-register-code-suggestion.cy.ts (CI-only)

**Labels:** investment: dev-platform, sprint-8

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/cash-register-code-suggestion.cy.ts` fails **only in CI** (the new `cypress-e2e` workflow — Chromium + a from-scratch Docker stack). Where it was runnable locally (`make cypress-run WORKSPACE=sushigo-b`, Electron) it **passed**.

CI-only (spec added by #498, never run locally in this pass): generic 10s retry timeout at cash-register-code-suggestion.cy.ts:32 — needs a look at what element/assertion stalls under the CI stack.

It was **quarantined** as part of #490 (a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset. This issue tracks fixing it and removing the guard.

## 💡 Hypothesis

CI-only discrepancy — a Chromium-vs-Electron behaviour difference (file upload / dialog lifecycle / overlay) or a fresh-stack seed/timing gap. Not reproducible on the local dev-lab stack, so debug from the CI artifacts (`cypress-screenshots-shard-*`, `e2e-docker-logs-shard-*`) or by running the E2E stack against a freshly-migrated `mydb_e2e`.

## 🔁 Reproduction guide

1. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/cash-register-code-suggestion.cy.ts`
2. Push and let the `cypress-e2e` workflow run it on a shard
3. Observe the failure above; download that shard's screenshot + docker-log artifacts

**Done when:** the spec passes reliably in CI, the guard is removed, and `cypress-e2e` is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `4h`
- **Tracked:** `17m`

### 📅 Sessions
```json
[
  { "date": "2026-09-13", "start": "20:12", "end": "20:29" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 17m (17m; 2026-09-13, 20:12–20:29)
- **vs optimistic:** −0h 43m
- **vs pessimistic:** −3h 43m

**Justification:**
Fresh-stack reproduction narrowed the failure to a missing admin permission grant and a Devtools button covering the form, allowing localized fixes using existing seeder conventions instead of a broader browser/timing investigation. The PR records successful Chrome/Electron runs and backend regression coverage; two Codex review rounds followed — the first identified mobile-menu overlap, addressed by hiding the launcher below the lg breakpoint; the second identified that CI's `retries=2` re-runs `beforeEach()` but not the file-level `before()`, so a failed attempt's REG-001 row would leak into a retry as REG-002 — fixed by moving `test:reset` into `beforeEach()`. The tracked total reflects only the existing recorded session; later review and closeout work has no additional session recorded and is not included in these 17 minutes.


