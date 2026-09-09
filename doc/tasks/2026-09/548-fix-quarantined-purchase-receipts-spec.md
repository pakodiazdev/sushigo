# 🧪 Fix quarantined Cypress spec: purchase-receipts.cy.ts

**Labels:** investment: dev-platform, sprint-7

## 🐞 Bug description

The Cypress E2E spec `cypress/e2e/purchase-receipts.cy.ts` fails against a fresh stack — both a from-scratch CI boot (the new `cypress-e2e` workflow) and a clean local `make cypress-run WORKSPACE=sushigo-b`.

Happy-path test fails: `expected '<option>' to be 'visible'` — a native <option> is never "visible" in Cypress; spec assertion bug.

It was **quarantined** as part of #490 (add a `before(function () { this.skip() })` guard at the top of the file) so the new `cypress-e2e` CI quality gate can go green on the stable subset of the suite. This issue tracks fixing the spec and removing that guard.

## 💡 Hypothesis

Pre-existing UI-test fragility (overlay/scroll/selector/seed), not a product regression — the suite has never been fully green even locally (see `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17). Needs a per-spec look: stale selector, missing `scrollIntoView()`, a DevDebugger/toast overlay not dismissed, or a seed/flow assumption that does not hold on a fresh DB.

## 🔁 Reproduction guide

1. Start the E2E stack: `make e2e WORKSPACE=sushigo-b`
2. Remove the `before(function () { this.skip() })` guard at the top of `cypress/e2e/purchase-receipts.cy.ts`
3. Run just this spec headless and observe the failure above

**Done when:** the spec passes reliably against a fresh stack, the `this.skip()` guard is removed, and the `cypress-e2e` workflow is green with it re-included.

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `30m`
- **Pessimistic:** `3h`
- **Tracked:** `2h31m`

### 📅 Sessions
```json
[
  { "date": "2026-09-08", "start": "21:16", "end": "21:47" },
  { "date": "2026-09-08", "start": "22:20", "end": "23:55" },
  { "date": "2026-09-09", "start": "00:15", "end": "00:40" }
]
```

## 📊 Retrospective

**Tracked:** `2h31m` — 31m + 1h35m + 25m across 3 sessions.

| | Optimistic | Pessimistic | Actual |
|---|---|---|---|
| Estimate | `30m` | `3h` | `2h31m` |

Variance: **+2h01m vs optimistic**, **−29m vs pessimistic** — landed near the pessimistic bound.

**Why it took the pessimistic path.** The optimistic estimate assumed a single stale selector. The spec had **six** independent defects, each only visible after fixing the previous one and re-running the full E2E stack:
1. stale destination `aria-label` (`Ubicación destino` → `Almacén / ubicación receptora`, renamed by #568/#572);
2. the seeded `InventoryLocation` needed `can_receive_purchases: true` — #568 turned it into an explicit persisted capability the Receipt form filters on;
3. the pagination test (added by #586) called `GET /inventory/products/{id}/variants/purchase-presentations`, a route that does not exist without a `{variantId}` → 404;
4. the actual `expected '<option>' to be 'visible'` flake: `cy.contains('Borrador')` matched the list filter's 0×0 native `<option>` instead of the panel pill — fixed by scoping assertions to the SlidePanel;
5. success toasts (fixed, top-right, 5 s) overlap the panel and Cypress runs its covered-element check on the `position: fixed` subtree — needed an explicit toast dismissal;
6. retry-unsafety (two separate holes, both flagged by Codex): `before()` does not re-run between Cypress `retries` attempts, so the empty-list assertion and the accumulating 16-receipt seed both compounded a first-attempt failure instead of recovering.

Session 1 got CI green on defects 1–5. Sessions 2–3 were two user-requested review passes that caught #6 (retry determinism — the pagination test now deletes prior-attempt DRAFT receipts before re-seeding) plus a `per_page` cap that 302-redirects rather than 422s, then the rebase onto #549, `/pr-comments`, and this close-out. Real E2E-stack round-trips (each fix = one ~35 s local Cypress run + a ~3.5 min CI shard) dominated the wall-clock.



