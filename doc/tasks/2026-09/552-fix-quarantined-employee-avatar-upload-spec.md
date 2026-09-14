# 🧪 Fix quarantined Cypress spec: employee-avatar-upload.cy.ts (CI-only)

**Labels:** investment: dev-platform

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/employee-avatar-upload.cy.ts` fails **only in CI** (the new `cypress-e2e` workflow — Chromium + a from-scratch Docker stack). Where it was runnable locally (`make cypress-run WORKSPACE=sushigo-b`, Electron) it **passed**.

CI-only (passes locally on Electron): `[data-testid="media-uploader-asset"]` never appears after the avatar file is selected (employee-avatar-upload.cy.ts:37) — the upload flow does not render the asset under Chromium.

It was **quarantined** as part of #490 (a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset. This issue tracks fixing it and removing the guard.

## 💡 Hypothesis

CI-only discrepancy — a Chromium-vs-Electron behaviour difference (file upload / dialog lifecycle / overlay) or a fresh-stack seed/timing gap. Not reproducible on the local dev-lab stack, so debug from the CI artifacts (`cypress-screenshots-shard-*`, `e2e-docker-logs-shard-*`) or by running the E2E stack against a freshly-migrated `mydb_e2e`.

## 🔁 Reproduction guide

1. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/employee-avatar-upload.cy.ts`
2. Push and let the `cypress-e2e` workflow run it on a shard
3. Observe the failure above; download that shard's screenshot + docker-log artifacts

**Done when:** the spec passes reliably in CI, the guard is removed, and `cypress-e2e` is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `4h`
- **Tracked:** `0h18m`

### 📅 Sessions
```json
[
  { "date": "2026-09-13", "start": "19:20", "end": "19:38" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 18m (18m)
- **vs optimistic:** −0h 42m
- **vs pessimistic:** −3h 42m

**Justification:** Came in well under the optimistic estimate because the actual root cause had
already been diagnosed and fixed while closing out the sibling issue #545: that PR's shared
`cypress.config.ts` secure-context exemption for `crypto.randomUUID()` on `e2e-ci`'s non-secure
`http://test_e2e:5173` origin (its own commit message explicitly flagged #552 as likely also
unblocked) meant this issue needed no application or config change at all — only removing the
`#490` quarantine guard and fixing one additional, independent test-only race (the submit button's
busy-state guard, same pattern already fixed for `item-media-gallery-uploader.cy.ts` in #545) and,
after Codex review, a retry-safety fix (a fixed employee email/name that would collide across a
`retries=2` CI rerun). The review-response and rebase work after the tracked session closed
(addressing the Codex finding, two `/rebase-main` passes to absorb sibling PRs #535/#553/#554
merging concurrently) happened in the same sitting but is not reflected as a separate Sessions
entry, per this project's convention of only `/start-issue`/`/issue*` opening session entries.


