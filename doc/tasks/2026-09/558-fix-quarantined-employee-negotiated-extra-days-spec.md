# 🧪 Fix quarantined Cypress spec: employee-negotiated-extra-days.cy.ts (CI-only)

**Labels:** investment: dev-platform

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/employee-negotiated-extra-days.cy.ts` fails **only in CI** (the new `cypress-e2e` workflow — Chromium + a from-scratch Docker stack). Locally (`make cypress-run WORKSPACE=sushigo-b`, Electron) it **passes**.

CI-only (passes locally on Electron): 1 of 5 tests fails — an <h3.flex.items-center.gap-2.text-sm.font-semibold> section heading is "not visible" after 15s — same overlay/scroll signature as #553.

It was **quarantined** as part of #490 (a `before(function () { this.skip() })` guard at the top of the file) so the `cypress-e2e` CI quality gate can go green on the stable subset. This issue tracks fixing it and removing the guard.

## 💡 Hypothesis

Same family as #553 — an `<h3>` section heading inside a scrollable panel is off-screen / clipped when Cypress asserts visibility. Under Chromium on the CI stack the panel likely renders at a different scroll position or height. Needs a `scrollIntoView()` / a more specific wait, or the section may genuinely not render on a fresh DB.

## 🔁 Reproduction guide

1. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/employee-negotiated-extra-days.cy.ts`
2. Push and let `cypress-e2e` run it on a shard; download that shard's screenshot artifact
3. Observe the `<h3>` "not visible" failure

**Done when:** the spec passes reliably in CI, the guard is removed, and `cypress-e2e` is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `45m`
- **Pessimistic:** `3h`
- **Tracked:** `30m`

### 📅 Sessions
```json
[
  { "date": "2026-09-30", "start": "16:04", "end": "16:34" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 30m (30m)
- **vs optimistic:** −15m
- **vs pessimistic:** −2h 30m

**Justification:** Delivered via `/issue-no-review` in one tracked session. Because the failure was
CI-only, the first step was the issue's own reproduction guide: push with the guard removed and let
`cypress-e2e` run it. That draft run failed exactly as reported, and its screenshot artifact gave the
root cause directly — `scrollIntoView()` parked the "Días extra" `h3` at the top of the Employee
Detail panel's scroll container, underneath the sticky "Detalle de Empleado" header (the same
fixed-header overshoot as #553). A local Chrome run with retries off did **not** reproduce it
(5/5 × 3), so CI was the only valid oracle; the fix (negative scroll offset on the heading,
`scrollBehavior: 'center'` on the "Ver historial" click) was then confirmed by two independent CI
runs, both 5/5 on the first attempt with no retry screenshots. Most of the wall-clock went to
waiting on those CI runs rather than to code changes.

Not tracked as a separate session: a follow-up `/pr-comments` pass for one Codex P1 thread. Codex
had reviewed the first commit (guard removal only, before the fix existed); the thread was answered
with the CI evidence and resolved with no code change, and this close-out ran right after.


