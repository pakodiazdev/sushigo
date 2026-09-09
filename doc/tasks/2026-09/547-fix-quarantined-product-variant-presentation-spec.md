# 🧪 Fix quarantined Cypress spec: product-variant-purchase-presentation.cy.ts

**Labels:** investment: dev-platform, sprint-7

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/product-variant-purchase-presentation.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Happy-path test fails: content 'Cypress Presentation Rice 1kg Bag' never appears (seed/flow).

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/product-variant-purchase-presentation.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `53m`

### 📅 Sessions
```json
[
  { "date": "2026-09-08", "start": "21:16", "end": "21:33" },
  { "date": "2026-09-09", "start": "00:05", "end": "00:41" }
]
```

## 📊 Retrospective

- **Tracked:** `53m` — session 1 `2026-09-08 21:16–21:33` (17m: diagnosis + fix + PR + CI), session 2 `2026-09-09 00:05–00:41` (36m: code review, retry-safety fix, rebase, close-out).
- **Variance:** `+23m` vs. optimistic (`30m`); `-2h07m` vs. pessimistic (`3h`). Landed near the optimistic end.
- **Narrative:** The root cause was found fast — `POST /units-of-measure` returns the numeric primary key as `id` while every consumer (`uom_id`, `compatible_dimension_uom_id`) resolves the UOM by `public_id`, so the seed's variant and template requests 422'd and the Variant never rendered. The failure had been invisible because `cy.request` sends no `Accept: application/json`, so Laravel's 302 validation redirect was silently followed to a 200. The fix (read the `public_id` back from `GET /units-of-measure`, add the `Accept` header) plus removing the `#490` skip guard was small. Session 2's extra time was one real review finding: Codex flagged that the `it` mutates state but `before()` is not re-run on a Cypress retry (CI uses `retries=2`), so a transient post-Assign failure would deterministically fail the retries at "No purchase presentations yet". Added a `beforeEach` API purge and verified it with a forced-failure run. No product code changed — the API `id`/`public_id` inconsistency was left as a noted out-of-scope follow-up.



