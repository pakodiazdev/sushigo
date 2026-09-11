# 🧪 Fix quarantined Cypress spec: price-lists.cy.ts

**Labels:** investment: dev-platform, sprint-8

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/price-lists.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Happy-path test fails: `cy.select()` on a <select> "covered by another element" (overlay).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/price-lists.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `1h30m`

### 📅 Sessions
```json
[
  { "date": "2026-09-10", "start": "01:48", "end": "02:03" },
  { "date": "2026-09-11", "start": "15:15", "end": "16:30" }
]
```

## 📊 Retrospective
- **Actual total:** 1h30m (15m + 75m)
- **vs optimistic:** +1h00m
- **vs pessimistic:** −1h30m (under)

**Justification:**
Session 1 (15m, 2026-09-10) was the straightforward part of the fix: remove the `#490` `this.skip()`
quarantine guard and verify the happy-path spec passes reliably against a fresh dev-lab E2E stack
(4/4 headless runs green, ~38s each) — no product code change needed, the overlay flake no longer
reproduced.

The overrun is entirely **review-response iteration** on the promoted PR (session 2, 75m,
2026-09-11), handled via `/pr-comments` rather than the autonomous review loop:
1. Codex (P2) — Cypress `retries=2` re-runs `beforeEach()` on a retry but not the suite-level
   `before()`, so a failed first attempt left Price Lists behind and the retry failed
   deterministically at `"No data available"` instead of retrying the real transient failure.
   Fixed with a per-attempt purge in `beforeEach()`.
2. Codex (P2) — follow-up finding that the purge fix's own claim was wrong: `PriceList` uses
   `SoftDeletes`, so the purge's `delete()` call only soft-deletes (the FK cascade to Assignments/
   Variant Prices never actually fires), and `unique:price_lists,code` still sees the soft-deleted
   row — a retry recreating the same `code` would 422. Fixed by suffixing each Price List's `code`
   with a per-attempt timestamp instead, matching the existing pattern in
   `purchase-receipts.cy.ts`.

Both rounds required re-deriving the exact SoftDeletes/FK/unique-index interaction from the actual
migrations and FormRequest rules (not just the review comment text) to land a fix that was actually
correct the second time, plus this `/finish-pr` closing pass itself.

