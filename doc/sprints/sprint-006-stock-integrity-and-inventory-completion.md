---
sprint: "006"
title: Stock Integrity & Inventory Completion
status: Completed

created: 2026-08-12
started: 2026-08-26
completed: 2026-08-30
last_updated: 2026-08-30

base_branch: main
base_commit: 28e87f8e
scope_issues: 5

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-005-purchasing-cost-and-pricing.md
next: sprint-007-warehouse-receiving-and-location-aware-stock.md
---

# Sprint 006 — Stock Integrity & Inventory Completion

> Complete the Inventory reconstruction by hardening Stock movements, location policy, horizontal
> authorization, navigation, and evidence-backed removal of legacy contracts.

> **Formally closed 2026-08-30 by #582.** All five scoped Issues (`#438`–`#442`) plus the
> opportunistic follow-ups were delivered, merged, and `Done` on the board. Sprint 007 was promoted
> on the same date, completing the lifecycle gate from `doc/conventions/sprints.md` §4.

## 1. Executive Summary

Sprint 006 contained `#438`–`#442`, five Issues estimated at **24h optimistic / 48h pessimistic**.
It normalized Stock Movement and immutable reversals, moved replenishment thresholds into the
Location + Variant context, enforced Operating Unit access, consolidated the final Inventory
navigation/workflows, and removed legacy fields only after reconciliation evidence existed.

All five shipped between 2026-08-26 and 2026-08-29 for **12h 5m tracked** across the Route A rounds
(**~50% of the optimistic estimate**), plus three opportunistic follow-ups (`#506`, `#519`, `#530`)
for a further 3h 14m. This is the cleanup sprint that finished functionality and integrity
together: it did not delete old schema first; it proved each replacement consumer, migrated /
reconciled data, and only then removed the obsolete source of truth.

## 2. Context

Sprints 4 and 5 establish replacement catalog, purchase, cost, and pricing domains. The remaining
Stock code still contains duplicated movement fields, incomplete reversal semantics, global
thresholds, insufficient horizontal scope, overlapping navigation, and legacy columns. Those risks
cannot be removed safely until the replacement verticals exist.

The SushiGo Admin Iteration is scheduled for **2026-10-04 through 2026-10-17**. Sprint 6 is the
planned completion boundary for the current Product Inventory roadmap, not a generic promise to
eliminate every unrelated technical-debt Issue.

## 3. Sprint Goal

**Sprint Goal:** Finish Inventory with auditable Stock corrections, location-aware policy,
Operating Unit isolation, one coherent UI, and reconciled removal of superseded contracts.

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | 2026-08-12 |
| Planned start | 2026-10-04 |
| Planned end | 2026-10-17 |
| Started | 2026-08-26 (promoted early from planned by `#519`) |
| Completed | 2026-08-30 (implementation finished 2026-08-29) |
| Target calendar duration | 14 days |
| Active workdays | 3 (2026-08-26, 2026-08-27, 2026-08-28; last PR merged 2026-08-29) |

## 5. Scope

### 5.1 Included

- Canonical Stock Movement lines and immutable compensating reversals (`#438`).
- Location + Variant replenishment thresholds (`#439`).
- Operating Unit access across Inventory data and mutations (`#440`).
- Consolidated Inventory navigation and workflows (`#441`).
- Reconciled removal of legacy fields and architecture documentation (`#442`).

### 5.2 Excluded

- Reimplementation of completed Product, purchase, cost, or pricing verticals.
- Deleting legacy data before parity, reconciliation, and rollback evidence.
- Unrelated deferred/backlog debt `#85`, `#276`, `#399`, and `#415`.
- New forecasting, automatic purchase-order, or warehouse-optimization features.

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| — | — | — | None | No additions, removals, deprecations, or cancellations after sprint start |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| 2026-08-26 | #519 | Promote Sprint 006 and formally close Sprint 005 | Sprint 005 closure checklist was complete | Sprint 006 activated and both sprint indexes synchronized |
| 2026-08-27 | #530 | Align documentation PHP version references with the 8.5 runtime | Sprint 005 review flagged docs/standards still stating PHP 8.2/8.3 while the stack runs 8.5 | 10 live references (README, CLAUDE.md, RESUME_STATUS.md, 4 backend convention headers, api-rules.md) updated to 8.5; `doc/tasks/**` archives and `composer.json` left untouched by design |

## 6. Value Ranking

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | `#438`, `#440` | Preserve immutable Stock evidence and prevent cross-unit access |
| **High** | `#439`, `#442` | Correct operational replenishment and remove competing sources safely |
| **Medium** | `#441` | Present the completed domains through one coherent operational UI |

### Ordering principle

> Harden data and access first, expose the final workflow second, and remove legacy contracts only
> after all replacement consumers and reconciliation checks are green.

## 7. Route A — Execution Rounds

### Round 1 — Stock and Access Foundations

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #438 | Normalize Stock Movements and immutable reversals | Critical | 6h | 12h | 2h45m | PR #525 (merged 2026-08-27, `db4ece252`) | Single-line contract + immutable, causally-linked compensating reversals; app-layer guards, StockMovementReverser, linked receipt reversal. Merged. |
| ✅ | #440 | Enforce Operating Unit access across Inventory | Critical | 5h | 10h | 3h52m | PR #529 (merged 2026-08-28, `5c9fa3826`) | Centralized `OperatingUnitScope` (active membership + explicit super-admin/admin bypass) enforced across Inventory Location list/show/mutation, stock queries, the replenishment-policy sub-resource and stock movements. Merged. |
|  |  | **Round total** |  | **11h** | **22h** | **6h37m** |  |  |

### Round 2 — Location Policy

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #439 | Configure replenishment thresholds per Location | High | 4h | 8h | 0h59m | PR #526 (merged 2026-08-27, `03e297d1a`) | Per-Location replenishment-threshold sub-resource on the stable Location policy/scope surface from #440; standard SAC + FormRequest + Resource CRUD. Merged. |
|  |  | **Round total** |  | **4h** | **8h** | **0h59m** |  |  |

### Round 3 — Consolidate Operational UI

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #441 | Consolidate Inventory navigation and workflows | Medium | 5h | 10h | 3h6m | PR #527 (merged 2026-08-28, `2167bf62f`) | Inventory routes unified under canonical Spanish `/inventario/*` with legacy redirects; one sidebar entry point; `StockMovement` types realigned with #438. Merged. |
|  |  | **Round total** |  | **5h** | **10h** | **3h6m** |  |  |

### Round 4 — Remove Legacy Sources

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #442 | Remove legacy fields and reconcile documentation | High | 4h | 8h | 1h23m | PR #534 (merged 2026-08-29, `5696c3439`) | Dropped unused `item_variants.sale_price/last_unit_cost/avg_unit_cost` via one non-lossy migration — `up()` copies each non-default row's exact values into a private `item_variant_legacy_cost_archive` table (no route/model/resource touches it, so it is not API-exposed) before the drop, `down()` restores them verbatim and drops the table; removed all readers/writers (API + legacy INSUMO/ACTIVO variant UI); reconciled product-catalog + inventory arch docs (en/es) + TD-03; `Item.sku` kept (authoritative for INSUMO/ACTIVO per #500). Merged. |
|  |  | **Round total** |  | **4h** | **8h** | **1h23m** |  |  |

## 8. Route B — Sequential Dependencies

```text
#430 (Sprint 3) → #438
Sprint 4 catalog + Sprint 5 operations → #440
#438 + #440 → #439 → #441 → #442
```

`#438` and `#440` may start in parallel. Replenishment consumes their stable Stock/access contract;
navigation then consolidates the completed workflows. `#442` is last because it removes schema and
code only after every replacement and migration check exists.

**Execution outcome:** the dependency chain held. `#438` and `#440` ran in parallel starting
2026-08-26/27, `#439` reused `#440`'s Location scope surface, `#441` consolidated the completed
workflows, and `#442` removed schema last with lossless archive + rollback evidence.

## 9. Conflict Risk Map

| Shared area | Issues | Rounds | Coordination |
|---|---|---|---|
| Stock models, services, movement resources | `#438`, `#439`, `#440`, `#442` | 1–4 | Sequence contracts and migration cleanup |
| Operating Unit/Location scopes | `#439`, `#440`, `#441` | 1–3 | Access scope precedes UI queries |
| Inventory routes, clients, types, navigation | `#439`, `#441`, `#442` | 2–4 | Replacement UI before deletion |
| Migrations and architecture docs | `#438`, `#439`, `#442` | 1, 2, 4 | Reconciliation owner is #442 |

No cross-issue merge conflicts materialized: the round sequencing kept the shared Stock/scope/route
surfaces single-writer per round.

## 10. Estimate Tracking by Round

| Round | Issues | Opt. | Pess. | Tracked | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 2 | 11h | 22h | 6h37m | −4h23m | −15h23m |
| 2 | 1 | 4h | 8h | 0h59m | −3h1m | −7h1m |
| 3 | 1 | 5h | 10h | 3h6m | −1h54m | −6h54m |
| 4 | 1 | 4h | 8h | 1h23m | −2h37m | −6h37m |
| **Total** | **5** | **24h** | **48h** | **12h5m** | **−11h55m** | **−35h55m** |

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Stock movement and access (`#438`, `#440`) | 11h–22h | 6h37m | −4h23m vs opt. |
| Replenishment (`#439`) | 4h–8h | 0h59m | −3h1m vs opt. |
| Navigation/workflows (`#441`) | 5h–10h | 3h6m | −1h54m vs opt. |
| Reconciliation/cleanup (`#442`) | 4h–8h | 1h23m | −2h37m vs opt. |
| **Route A total** | **24h–48h** | **12h5m** | **−11h55m vs opt.** |
| Opportunistic (`#506` 27m, `#519` 42m, `#530` 2h5m) | — | 3h14m | — |
| **Grand total** | — | **15h19m** | — |

### Wall-Clock Time & Parallelism

- **Person-hours:** 15h 19m (Route A 12h 5m + opportunistic 3h 14m)
- **Wall-clock time:** ~11h 36m (union of all session intervals across 2026-08-26 → 2026-08-28)
- **Parallelization factor:** ~1.32× (15h19m person-hours / 11h36m wall-clock)
- **Peak concurrency:** 3 (2026-08-27 ~12:25, `#441` + `#440` + `#530` sessions overlapping)

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| 2026-08-26 | ~2h14m union | `#519` (promotion), `#438` s1+s2, `#439`, `#506` |
| 2026-08-27 | ~8h26m union | `#438` s3, `#440` s1+s2, `#441` s1+s2, `#530`, `#442` s1 |
| 2026-08-28 | ~56m | `#442` s2 |

## 12. Notes on Estimate Confidence

Confidence was rated **medium-low** because migration/reconciliation work depended on data produced
by three prior sprints. In execution the range proved conservative: the replacement verticals
(Sprints 4–5) were stable, every destructive step in `#442` was preceded by a lossless archive +
rollback path, and no unexpected legacy consumer forced `#442` to expand. Tracked time landed at
~50% of the optimistic estimate — consistent with the rest of the Inventory series, where each
Issue reused an already-established contract (SAC + FormRequest + Resource, `OperatingUnitScope`,
the canonical `/inventario/*` route tree) rather than designing one.

## 13. Execution Evidence

| Status | Issue | Result | PR / Commit | Tracked | Notes |
|---|---:|---|---|---:|---|
| ✅ | #438 | Normalized the Stock Movement contract to single-line (header owns Variant + qty), made POSTED movements immutable/non-deletable, and added `StockMovementReverser` — a causally-linked, direction-mirrored compensating movement that flips the original to REVERSED and restores the balance exactly once; `ReceiptService::reverseReceipt` now links + guards the same way. Single-line / single-reversal / positive-qty / status-transition / reason↔direction invariants are enforced at the app layer with DB constraints as backstop. | PR #525 — merged 2026-08-27 (`db4ece252`) | 2h45m | 25 new PHPUnit tests (StockMovementContractTest, StockMovementReverserTest, ReceiptReversalTest linkage); full inventory regression 429→green; Pint clean; SonarCloud `api` gate OK, 0 new smells, new coverage 89%. 5 automated-review threads (Codex P1/P2 + Copilot) all addressed with regression tests. Contract-column removal deferred to #442 per §9. Pre-existing flaky payroll test-isolation cascade surfaced during CI (non-deterministic, `main` green, passes on re-run) — mitigated defensively, root cause out of scope. |
| ✅ | #439 | Added a per-Inventory-Location replenishment-threshold sub-resource (min/max resolved in the Location + Variant context) on top of the Operating Unit / Location policy surface from #440, using the standard Single Action Controller + FormRequest + JsonResource CRUD pattern; global Variant thresholds are superseded by the location-specific policy. | PR #526 — merged 2026-08-27 (`03e297d1a`) | 0h59m | Delivered in a single 59-minute session with no review-response cycles. PHPUnit coverage for threshold CRUD, resolution precedence, and access scope; inventory regression green; Pint/CI clean. Issue body finalized (Tracked + Retrospective) during the Sprint 006 close-out — finish-pr's issue finalization had been skipped when PR #526 merged. |
| ✅ | #440 | Centralized `OperatingUnitScope` (active `operating_unit_users` membership + an explicit `super-admin`/`admin` bypass constant) and enforced it across Inventory Location list/show/create/update/delete, the stock query endpoints, the per-location replenishment-policy sub-resource, and the `opening-balance`/`stock-out` movements — a capable user can no longer reach another Operating Unit by guessing public IDs or changing filters. | PR #529 — merged 2026-08-28 (`5c9fa3826`) | 3h52m | +2 PHPUnit suites (`OperatingUnitScopeTest`, `OperatingUnitAccessTest`) plus extended `InventoryLocationPolicyTest`; inventory regression green; Pint clean; SonarCloud `api` gate OK, 0 new smells (S4144 duplicate-body fix), new coverage 99%. Copilot + Codex P1 (unscoped replenishment-policy endpoints) threads addressed with tests. Receipts + additional stock filters deferred to #432 per the issue. Same pre-existing flaky payroll shard-isolation cascade surfaced in CI, passed on re-run. |
| ✅ | #441 | Every Inventory browser route moved to the canonical Spanish `/inventario/*` tree (`productos`/`insumos`/`variantes`/`ubicaciones`/`existencias`) with redirect-only stubs left at the released English URLs; the Sidebar "Inventario" group is now the single entry point for all eight concepts (standalone "Stock Dashboard" folded in as "Existencias"); the `/inventory/` card-grid duplicate is gone; `StockMovement`/`StockMovementLine` types realigned with `App\Models\StockMovement` post-#438; shared list-screen scaffolding extracted into `CrudSlidePanels`/`StatusFilterSelect`/`InventoryListLayout`. | PR #527 — merged 2026-08-28 (`2167bf62f`) | 3h6m | Vitest green (new redirect + shared-component + type tests; Sidebar/breadcrumbs updated); `inventory-navigation` Cypress happy path added + six existing specs updated for the new paths; ESLint + `tsc` clean; SonarCloud `webapp` gate OK (new coverage 100%, duplication 2.5% after the three extractions cleared the 3% gate). 1 Codex P2 review thread addressed (ambiguous `Productos` link selector → select submenu links by exact `href`). TT4 loading/empty/error-state + Spanish-copy sweep and TT6 route-level lazy loading deliberately deferred. Cypress not run locally (workspace-a E2E stack down; cross-workspace test-DB collision risk). |
| ✅ | #442 | Dropped the superseded `item_variants.sale_price/last_unit_cost/avg_unit_cost` columns (Milestone C; `min_stock/max_stock` already gone via #439) in one non-lossy, non-exposing migration — `up()` copies every non-default row's exact values into a dedicated internal `item_variant_legacy_cost_archive` table (no model/route/resource references it, so it never leaks through the `/item-variants` list endpoint the way `meta` would) before the drop, `down()` restores each verbatim and drops the table; stripped every reader/writer (`ItemVariant` model, `CreateItemVariantController`, `Create`/`UpdateItemVariantRequest`, `FormatsItemVariant`, `ItemVariantResponse`, factory, Fakes/Testing seeders) and the legacy INSUMO/ACTIVO variant form/details/list/opening-balance UI; reconciled product-catalog + inventory architecture docs (en/es) and TD-03. `Item.sku` deliberately retained — authoritative for INSUMO/ACTIVO per merged #500, only PRODUCTO-deprecated. | PR #534 — merged 2026-08-29 (`5696c3439`) | 1h23m | +`LegacyInventoryFieldRemovalTest` (7 cases incl. lossless `up()`/`down()` round-trip and "archive not exposed by the variant API"); removed obsolete `WeightedAverageCostReconciliationTest`; ~965 API tests + 236 webapp tests green; migration fresh/rollback/re-migrate verified with seeded data; Pint/ESLint/tsc clean; full CI green (30/30 — incl. the new #490 sharded Cypress E2E gate, all 6 shards pass — and both SonarCloud gates). `StockMovementLine` redundant-column pruning explicitly scoped out to a follow-up (§17). Automated review (Copilot/Codex/Devin) intentionally not run — `/issue-no-review`. |
| ✅ | #519 | Sprint 005 marked `Completed`; Sprint 006 promoted from `planned/`; both sprint indexes synced; GitHub Project `Iteration` dates corrected (all 85 previously-linked items reassigned and verified); `iteration-progress.svg` badge refreshed to "Sprint 6" | PR #520 — merged 2026-08-27 (`ae7c5aaf5`) | 42m | opportunistic work per §5.4; 2 Copilot review threads addressed (stale `.gitignore` path reference, PR-description accuracy on the root README's `(current)` suffix convention) plus a user-reported §4 Timeline/frontmatter sync fix |
| ✅ | #506 | Supplier-offering Producto/Variante selectors now search server-side (debounced free text → paginated `per_page: 20`) instead of reading a single `per_page: 100` page; added a `search` filter to `GET /inventory/products/{id}/variants` with `is_active` applied before pagination, and a selected-but-filtered-out option clears with its cascade | PR #523 — merged 2026-08-27 (`bd6ebb00e`) | 27m | follow-up debt carried in from a stale `sprint-5` label (§17), not part of the Route A rounds; +5 PHPUnit cases (search by name/code, variant past page 1, `is_active` filter, array-search 422, failed-search preservation); Vitest suite rewritten against a real QueryClient; Pint/ESLint/TS clean; 6 review threads resolved. Merged. |
| ✅ | #530 | Aligned all live documentation to the PHP 8.5 runtime — updated the README PHP badge + stack table, `CLAUDE.md`, `RESUME_STATUS.md`, and 4 backend convention scope headers + `api-rules.md` (10 references) from 8.2/8.3 to 8.5; `doc/tasks/**` archives and `composer.json` (`^8.2`) intentionally untouched | PR #531 — merged 2026-08-27 (`8b92ab386`) | 2h05m | opportunistic doc-only follow-up per §5.4 from the Sprint 005 review; no code, tests, or Swagger affected; verified with `grep -rniE "php[ _-]?8\.[0-3]" --include="*.md"` returning only archive hits; 0 review threads, CI green. Merged. |

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Stock corrections | Duplicated fields/incomplete reversal | Immutable linked compensating movements | Single-line contract; POSTED movements immutable; `StockMovementReverser` causally-linked single-reversal (#438) | ✅ |
| Replenishment | Global Variant thresholds | Location-specific resolved policy | Per-Inventory-Location threshold sub-resource, resolved in Location + Variant context (#439) | ✅ |
| Horizontal access | Capability without complete membership scope | Operating Unit isolation across Inventory | Centralized `OperatingUnitScope` enforced across Location CRUD, stock queries, replenishment policy, movements (#440) | ✅ |
| Inventory navigation | Overlapping/stale paths | One entry point per operational concept | All routes on canonical `/inventario/*`, one Sidebar group, `/inventory/` duplicate removed (#441) | ✅ |
| Legacy sources | Multiple active fields/contracts | Reconciled replacement or explicit archive decision | `sale_price/last_unit_cost/avg_unit_cost` dropped via lossless archived migration; all readers/writers removed; docs + TD-03 reconciled (#442) | ✅ |

## 15. Results

### 15.1 Delivered Value

A complete, auditable, location-aware, horizontally authorized Inventory module with no competing
legacy workflow or source of truth. Stock corrections are immutable and causally linked;
replenishment policy is resolved per Location; every Inventory endpoint and mutation is scoped to
the caller's Operating Unit membership; all Inventory UI lives under one canonical Spanish route
tree with a single Sidebar entry point; and the superseded `item_variants` cost/price columns were
removed only after a lossless archive + verified rollback. This closes the Product Inventory
roadmap that ran across Sprints 4–6.

### 15.2 Planned vs. Actual

- Planned: 5 Issues, 24h–48h.
- Completed: 5 / 5 (`#438`, `#439`, `#440`, `#441`, `#442`) — all merged, all `Done` on the board.
- Tracked (Route A): 12h 5m — ~50% of the optimistic estimate, ~25% of the pessimistic.
- Opportunistic: 3 Issues (`#506`, `#519`, `#530`), 3h 14m — all merged.
- Grand total tracked: 15h 19m person-hours over ~11h 36m wall-clock (~1.32× parallelization).

### 15.3 Known Limitations

- `#441` deferred TT4 (loading/empty/error states + Spanish-copy sweep) to `#576` and TT6
  (route-level lazy loading) to `#577`; its quarantined navigation path is tracked separately by
  Sprint 7 `#544`.
- `#442` scoped out `StockMovementLine` redundant-column pruning to backlog `#575` (§17).
- `#440` deferred Receipt and additional Stock query scoping; Sprint 7 `#572` and `#574` now own
  those explicit contracts rather than reopening closed `#432`.
- Reviews for `#438`/`#440` exposed an API shard transaction-poisoning/database-isolation flake
  whose final symptom appeared in unrelated Payroll tests; backlog `#578` owns the root cause.
- This sprint closes the current Inventory roadmap, not unrelated deferred project debt
  (`#85`, `#276`, `#399`, `#415`).

## 16. Lessons Learned

- Planning lesson: deletion is the final migration operation, not the redesign strategy.
  Replacement, parity, reconciliation, and rollback evidence must exist before removing a legacy
  source — `#442` shipped in 1h 23m precisely because that evidence already existed.
- Estimation lesson: for the fourth sprint running, an Inventory Issue that reuses an established
  contract (SAC + FormRequest + Resource, `OperatingUnitScope`, the `/inventario/*` tree) lands at
  roughly half its optimistic estimate. The 24h–48h range should have been tightened once Sprints
  4–5 had proven the pattern.
- Process lesson: `/finish-pr` was skipped on merge for `#439` (and later `#501`), leaving issue
  bodies without finalized Tracked / Retrospective sections. Both were reconciled retroactively
  during this close-out; the merge step should not be run before `/finish-pr`.

## 17. Follow-up Work

| Status | Issue | Work | Candidate Sprint |
|---|---:|---|---|
| ⏳ | #575 | Prune reconciled `StockMovementLine.item_variant_id` / `base_qty` duplication while preserving transaction-UOM and financial evidence — scoped out of `#442` after the single-line header contract from `#438` | Sprint 008 |
| ⏳ | #576 | Complete `#441` TT4: shared loading/empty/error/permission states, accessibility, and Spanish-copy consistency across canonical Inventory screens | Sprint 008 |
| ⏳ | #577 | Complete `#441` TT6: evidence-backed TanStack route-level lazy loading beginning with `/inventario/*`, preserving guards and redirects | Sprint 008 |
| ⏳ | #578 | Find and eliminate the first API database failure that poisons a shard and surfaces as unrelated Payroll failures; enforce CI/workspace test-database isolation | Sprint 008 |
| ⏳ | TBD | Any reconciliation gap discovered post-`#442` (none found at close-out) | Backlog only if evidence requires it |
| ✅ | #582 | Promoted Sprint 007 and formally closed Sprint 006; synchronized both indexes, Project iteration assignments, and badge | Sprint 007 |
| ✅ | #506 | Replace the supplier-offering form's product/variant `<select>`s with a searchable/paginated combobox — deferred from `#431`'s PR #496 review; moved here from a stale `sprint-5` label after Sprint 005 closed with it still open. Delivered via PR #523 (server-side search, see §13) | Sprint 006 |
| ✅ | #530 | Align documentation PHP version references with the 8.5 runtime — Sprint 005 review flagged docs still stating PHP 8.2/8.3 while `docker/app/Dockerfile` and CI already run 8.5. Opportunistic (§5.4), doc-only. Delivered via PR #531 (see §13) | Sprint 006 |

## 18. Sprint Closure Checklist

- [x] All five Issues are linked, labeled `sprint-6`, and assigned to Sprint 6.
- [x] Every Issue has a final status and PR/commit evidence. (`#438` PR #525, `#439` PR #526, `#440` PR #529, `#441` PR #527, `#442` PR #534 — all merged; all `Done` on the board.)
- [x] Scope changes and tracked Sessions are synchronized. (No scope changes; per-issue Tracked recorded in §7/§13 from each issue's finalized Sessions array; `#439` finalized during this close-out.)
- [x] Estimates, wall-clock time, parallelism, and quality results are finalized. (§10, §11, §14.)
- [x] Dependencies, conflicts, delivered value, limitations, and lessons reflect execution. (§8, §9, §15, §16.)
- [x] Reconciliation proves safe legacy removal and follow-ups are filed. (`#442` lossless archive
      + verified rollback; `#575` movement-line pruning, `#576`/`#577` for `#441` TT4/TT6, and
      review-discovered test isolation `#578` are filed in §17.)

- [x] Sprint 007 was promoted on 2026-08-30 by #582; Sprint 006 is now a historical `Completed`
      record under `doc/conventions/sprints.md` §4.
