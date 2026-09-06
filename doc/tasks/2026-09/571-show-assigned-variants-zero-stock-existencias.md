# 📊 Show assigned Variants with zero Stock in Existencias

**Labels:** enhancement, backend, frontend, investment: product, sprint-7

# 📊 Show assigned Variants with zero Stock in Existencias

## Description

Change Stock read models and the canonical Existencias page to start from managed Variant-to-Location assignments and left-join the physical `stock` projection. Assigned pairs with no Stock row must be returned and displayed as zero on-hand/reserved/available/cost/value, while real Stock rows retain their public identity and valuation.

## Reason

Current queries start from `Stock`, so the dashboard cannot distinguish "this Variant is expected here and is out of stock" from "this Variant is not managed here." That hides never-received assortment, suppresses valid zero-stock replenishment alerts, and makes the dashboard incomplete as an operational view.

## Objective

Make Existencias a Location-aware assortment and balance projection that includes configured zero Stock without creating fake Stock rows or movements.

## Dependencies

- Depends on #569 for the assignment source of truth and its data backfill.
- Reuses #439 replenishment policies and #440 Operating Unit scope.

## Domain decisions

- Assignment is the query spine; Stock remains optional until the first posted movement.
- Missing Stock projects numeric balance/cost/value fields as zero and exposes `stock_id: null`; it does not persist a zero Stock row.
- An assigned zero balance is low-stock only when a live replenishment policy exists and `0 <= min_stock` under the existing #439 rule.
- Summary totals count assigned Variants, not only materialized Stock rows.
- Unassigned historical Stock cannot be silently hidden; #569's backfill guarantees every existing Stock pair is assigned before this query ships.

## ✅ Technical Tasks

### Backend read model

- [x] 🧠 Add a dedicated projection/query service or DTO for assignment + optional Stock + optional replenishment policy; do not overload unsaved `Stock` models with fake IDs.
- [x] 🔎 Refactor `GET /stock`, `/stock/by-location/{id}`, and `/stock/by-variant/{id}` to return assigned zero rows consistently.
- [x] 🛡️ Apply `OperatingUnitScope` before filters and pagination.
- [x] 📊 Recalculate totals, valuation, available, low-stock count, and pagination from the assignment-aware row set.
- [x] 🔍 Preserve filters by Location, Variant, minimum on-hand, and low-stock with defined zero-row behavior.
- [x] 📦 Version/extend the response shape explicitly so the frontend can distinguish assignment ID from nullable Stock ID.

### Existencias UI

- [ ] 🌎 Finish Spanish operational copy for the page, columns, filters, summaries, loading, error, and empty states.
- [x] 0️⃣ Render assigned-but-never-received Variants as zero without suggesting a database Stock record exists.
- [x] 🔔 Show valid zero-stock replenishment alerts and configured min/max values.
- [ ] 🧭 Add filters for Operating Unit/Location and make row identity stable across real and projected Stock rows.
- [ ] 🔄 Keep queries coherent after assignment, Receipt, Opening Balance, Transfer, and policy mutations.
- [x] ♿ Preserve table semantics, keyboard interaction, and responsive behavior.

### Tests and docs

- [x] 🧪 Cover assigned-with-Stock, assigned-without-Stock, unassigned, zero policy, no policy, soft-deleted assignment, and cross-unit scope.
- [x] 🧪 Verify summaries and every filter/pagination combination include or exclude projected zero rows correctly.
- [x] 🧪 Prove reads never create `stock` or `stock_movements` rows.
- [x] 🧪 Add frontend service/page tests and update the Stock Dashboard Cypress path.
- [x] 📖 Update bilingual Inventory architecture with the assignment/ledger/projection distinction.

## 🎯 Acceptance Criteria

- [x] Every active assigned Variant appears in Existencias for its Location even before first receipt.
- [x] Missing physical Stock is represented as zero in responses and UI without persisting a Stock row.
- [x] Existing Stock, cost, available quantity, and valuation remain unchanged.
- [x] Low-stock semantics use the existing per-Location policy and work for projected zero rows.
- [x] Unassigned Variants do not appear; existing historical Stock remains visible through migration backfill.
- [x] All list/detail/filter/summary results respect Operating Unit access.
- [x] Querying the dashboard is side-effect free.

## Parallelization and ownership

- **Sprint 7 lane:** Vertical G, starts after #569.
- **Can run in parallel with:** Receipt hardening, Opening Balance, and Transfers.
- **Primary ownership:** Stock query controllers/read projection/response tests and broad `inventario/existencias.tsx` rendering.
- **Coordination boundary:** the Opening Balance issue may add an action button and query invalidation, but this issue owns the dashboard data shape and table/summary changes.

## Out of scope

- Creating zero Stock rows.
- Assignment management UI (owned by #569).
- Automatic purchase orders or demand forecasting.
- Warehouse hierarchy.

## 🔗 References

- #439 — per-Location replenishment policy.
- #440 — Operating Unit Stock scope.
- #569 — managed Variant-to-Location assignment.
- `app/Http/Controllers/Api/V1/Stock/ListStockController.php`
- `app/Http/Controllers/Api/V1/Stock/StockByLocationController.php`
- `webapp/src/pages/inventario/existencias.tsx`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `6h` · **Pessimistic:** `11h` · **Tracked:** `2h 1m`

### 📅 Sessions
```json
[
  { "date": "2026-09-06", "start": "00:01", "end": "02:02" }
]
```





## 📊 Retrospective

- **Actual total:** 2h 1m (2h 1m — single recorded session, 2026-09-06 00:01–02:02)
- **vs optimistic:** −3h 59m
- **vs pessimistic:** −8h 59m

**Justification:**

The `2h 1m` figure is the one work session logged on this issue (`/issue-no-review`), covering the
autonomous first pass: TDD of `AssignmentAwareStockProjection` (assignment-spined `LEFT JOIN` stock
+ live policy, zero-projection rule, assignment-aware summary), rewriting `ListStock` /
`StockByLocation` / `StockByVariant` onto that spine, `OperatingUnitScope::constrainAssignments`,
the Spanish operational copy for `/inventario/existencias`, `AssignmentAwareExistenciasTest`
(14 cases), the bilingual `§3.14` architecture entry, CI to green, and the squash. It landed well
under the optimistic estimate because #439's per-Location replenishment feature and #569's
assignment model were near-exact structural templates — most of the work was adaptation of an
existing route/scope/resource shape, not new design.

Five further commits followed, driven through `/pr-comments` (Copilot/Codex review was deferred by
`/issue-no-review`, then processed by hand) rather than tracked issue sessions, so their time is
not reflected above:

- `75cd788c` → the squashed first pass described above.
- `cd8b08a1` — two Codex P1s: `StockMutationService::receiveInto()` now creates/reactivates the
  pair's `VariantLocationAssignment` on first receipt (extending #569's "a Stock pair implies a
  live assignment" past the one-time backfill), and `baseQuery()` excludes assignments whose
  Variant or Location was soft-deleted (was a global `/stock` 500).
- `fbe0d29c` — Codex P1 follow-up: move the assignment ensure to run *under* the Stock-row
  `FOR UPDATE` lock, serializing it against #569's concurrent unassign (the earlier placement left
  a TOCTOU window).
- `66dd8557` — Codex P1: `existencias.tsx` pages through the whole assortment (`fetchAllPages`)
  before computing summaries, so a tenant with >500 managed pairs is not silently under-counted.
- `8ff65ae0` — reviewer-relayed: extend the soft-deleted-relation guard to the Location's
  Operating Unit (`DeleteOperatingUnitController` has no cascade), and `404` `by-location` for a
  Location whose Operating Unit is gone, instead of an admin-path null-deref 500.

PR #606 was rebase-merged as those 5 commits (not squashed). Re-derived, the full delivery
including the review-response cycles would still have sat toward the optimistic end of the
`6h–11h` band; the negative variance above is an artifact of the Sessions log capturing only the
first stretch.

