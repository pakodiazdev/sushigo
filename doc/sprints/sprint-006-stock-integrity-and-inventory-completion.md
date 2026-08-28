---
sprint: "006"
title: Stock Integrity & Inventory Completion
status: In Progress

created: 2026-08-12
started: 2026-08-26
completed:
last_updated: 2026-08-26

base_branch: main
base_commit: 28e87f8e
scope_issues: 5

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-005-purchasing-cost-and-pricing.md
next:
---

# Sprint 006 — Stock Integrity & Inventory Completion

> Complete the Inventory reconstruction by hardening Stock movements, location policy, horizontal
> authorization, navigation, and evidence-backed removal of legacy contracts.

## 1. Executive Summary

Sprint 006 contains `#438`–`#442`, five Issues estimated at **24h optimistic / 48h pessimistic**.
It normalizes Stock Movement and immutable reversals, moves replenishment thresholds into the
Location + Variant context, enforces Operating Unit access, consolidates the final Inventory
navigation/workflows, and removes legacy fields only after reconciliation evidence exists.

This is the cleanup sprint that finishes functionality and integrity together. It does not delete
old schema first; it proves each replacement consumer, migrates/reconciles data, and then removes
the obsolete source of truth.

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
| Completed | — |
| Target calendar duration | 14 days |
| Active workdays | — |

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
| — | — | — | None yet | — |

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
| ✅ | #438 | Normalize Stock Movements and immutable reversals | Critical | 6h | 12h | 2.8h | PR #525 | Single-line contract + immutable, causally-linked compensating reversals; app-layer guards, StockMovementReverser, linked receipt reversal. PR ready, merge pending |
| ✅ | #440 | Enforce Operating Unit access across Inventory | Critical | 5h | 10h | 3.9h | PR #529 | Centralized `OperatingUnitScope` (active membership + explicit super-admin/admin bypass) enforced across Inventory Location list/show/mutation, stock queries, the replenishment-policy sub-resource and stock movements. PR ready, merge pending |
|  |  | **Round total** |  | **11h** | **22h** | **—** |  |  |

### Round 2 — Location Policy

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #439 | Configure replenishment thresholds per Location | High | 4h | 8h | — | — | Consume stable Stock/access scopes |
|  |  | **Round total** |  | **4h** | **8h** | **—** |  |  |

### Round 3 — Consolidate Operational UI

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #441 | Consolidate Inventory navigation and workflows | Medium | 5h | 10h | 3.1h | PR #527 | Inventory routes unified under canonical Spanish `/inventario/*` with legacy redirects; one sidebar entry point; `StockMovement` types realigned with #438 — PR ready, merge pending |
|  |  | **Round total** |  | **5h** | **10h** | **—** |  |  |

### Round 4 — Remove Legacy Sources

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #442 | Remove legacy fields and reconcile documentation | High | 4h | 8h | — | — | Destructive schema cleanup only after evidence |
|  |  | **Round total** |  | **4h** | **8h** | **—** |  |  |

## 8. Route B — Sequential Dependencies

```text
#430 (Sprint 3) → #438
Sprint 4 catalog + Sprint 5 operations → #440
#438 + #440 → #439 → #441 → #442
```

`#438` and `#440` may start in parallel. Replenishment consumes their stable Stock/access contract;
navigation then consolidates the completed workflows. `#442` is last because it removes schema and
code only after every replacement and migration check exists.

## 9. Conflict Risk Map

| Shared area | Issues | Rounds | Coordination |
|---|---|---|---|
| Stock models, services, movement resources | `#438`, `#439`, `#440`, `#442` | 1–4 | Sequence contracts and migration cleanup |
| Operating Unit/Location scopes | `#439`, `#440`, `#441` | 1–3 | Access scope precedes UI queries |
| Inventory routes, clients, types, navigation | `#439`, `#441`, `#442` | 2–4 | Replacement UI before deletion |
| Migrations and architecture docs | `#438`, `#439`, `#442` | 1, 2, 4 | Reconciliation owner is #442 |

## 10. Estimate Tracking by Round

| Round | Issues | Opt. | Pess. | Tracked | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 2 | 11h | 22h | — | — | — |
| 2 | 1 | 4h | 8h | — | — | — |
| 3 | 1 | 5h | 10h | — | — | — |
| 4 | 1 | 4h | 8h | — | — | — |
| **Total** | **5** | **24h** | **48h** | **—** | **—** | **—** |

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Stock movement and access (`#438`, `#440`) | 11h–22h | — | — |
| Replenishment (`#439`) | 4h–8h | — | — |
| Navigation/workflows (`#441`) | 5h–10h | — | — |
| Reconciliation/cleanup (`#442`) | 4h–8h | — | — |
| **Total** | **24h–48h** | **—** | **—** |

### Wall-Clock Time & Parallelism

- **Person-hours:** —
- **Wall-clock time:** —
- **Parallelization factor:** —
- **Peak concurrency:** —

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| — | — | No sessions yet |

## 12. Notes on Estimate Confidence

Confidence is **medium-low** because migration/reconciliation work depends on the data produced by
three prior sprints. The range assumes those contracts are stable and all destructive cleanup is
deferred until evidence exists. Unexpected legacy consumers must expand `#442` transparently rather
than being silently deleted.

## 13. Execution Evidence

| Status | Issue | Result | PR / Commit | Tracked | Notes |
|---|---:|---|---|---:|---|
| ✅ | #438 | Normalized the Stock Movement contract to single-line (header owns Variant + qty), made POSTED movements immutable/non-deletable, and added `StockMovementReverser` — a causally-linked, direction-mirrored compensating movement that flips the original to REVERSED and restores the balance exactly once; `ReceiptService::reverseReceipt` now links + guards the same way. Single-line / single-reversal / positive-qty / status-transition / reason↔direction invariants are enforced at the app layer with DB constraints as backstop. | PR #525 | 2.8h | 25 new PHPUnit tests (StockMovementContractTest, StockMovementReverserTest, ReceiptReversalTest linkage); full inventory regression 429→green; Pint clean; SonarCloud `api` gate OK, 0 new smells, new coverage 89%. 5 automated-review threads (Codex P1/P2 + Copilot) all addressed with regression tests. Contract-column removal deferred to #442 per §9. Pre-existing flaky payroll test-isolation cascade surfaced during CI (non-deterministic, `main` green, passes on re-run) — mitigated defensively, root cause out of scope. |
| ⏳ | #439 | Pending | — | — | Location replenishment |
| ✅ | #440 | Centralized `OperatingUnitScope` (active `operating_unit_users` membership + an explicit `super-admin`/`admin` bypass constant) and enforced it across Inventory Location list/show/create/update/delete, the stock query endpoints, the per-location replenishment-policy sub-resource, and the `opening-balance`/`stock-out` movements — a capable user can no longer reach another Operating Unit by guessing public IDs or changing filters. | PR #529 | 3.9h | +2 PHPUnit suites (`OperatingUnitScopeTest`, `OperatingUnitAccessTest`) plus extended `InventoryLocationPolicyTest`; inventory regression green; Pint clean; SonarCloud `api` gate OK, 0 new smells (S4144 duplicate-body fix), new coverage 99%. Copilot + Codex P1 (unscoped replenishment-policy endpoints) threads addressed with tests. Receipts + additional stock filters deferred to #432 per the issue. Same pre-existing flaky payroll shard-isolation cascade surfaced in CI, passed on re-run. |
| ✅ | #441 | Every Inventory browser route moved to the canonical Spanish `/inventario/*` tree (`productos`/`insumos`/`variantes`/`ubicaciones`/`existencias`) with redirect-only stubs left at the released English URLs; the Sidebar "Inventario" group is now the single entry point for all eight concepts (standalone "Stock Dashboard" folded in as "Existencias"); the `/inventory/` card-grid duplicate is gone; `StockMovement`/`StockMovementLine` types realigned with `App\Models\StockMovement` post-#438; shared list-screen scaffolding extracted into `CrudSlidePanels`/`StatusFilterSelect`/`InventoryListLayout`. | PR #527 | 3.1h | Vitest green (new redirect + shared-component + type tests; Sidebar/breadcrumbs updated); `inventory-navigation` Cypress happy path added + six existing specs updated for the new paths; ESLint + `tsc` clean; SonarCloud `webapp` gate OK (new coverage 100%, duplication 2.5% after the three extractions cleared the 3% gate). 1 Codex P2 review thread addressed (ambiguous `Productos` link selector → select submenu links by exact `href`). TT4 loading/empty/error-state + Spanish-copy sweep and TT6 route-level lazy loading deliberately deferred. Cypress not run locally (workspace-a E2E stack down; cross-workspace test-DB collision risk). |
| ⏳ | #442 | Pending | — | — | Reconciled legacy removal |
| ✅ | #519 | Sprint 005 marked `Completed`; Sprint 006 promoted from `planned/`; both sprint indexes synced; GitHub Project `Iteration` dates corrected (all 85 previously-linked items reassigned and verified); `iteration-progress.svg` badge refreshed to "Sprint 6" | PR #520 | 0.7h | opportunistic work per §5.4; 2 Copilot review threads addressed (stale `.gitignore` path reference, PR-description accuracy on the root README's `(current)` suffix convention) plus a user-reported §4 Timeline/frontmatter sync fix |
| ✅ | #506 | Supplier-offering Producto/Variante selectors now search server-side (debounced free text → paginated `per_page: 20`) instead of reading a single `per_page: 100` page; added a `search` filter to `GET /inventory/products/{id}/variants` with `is_active` applied before pagination, and a selected-but-filtered-out option clears with its cascade | PR #523 | 0.5h | follow-up debt carried in from a stale `sprint-5` label (§17), not part of the Route A rounds; +5 PHPUnit cases (search by name/code, variant past page 1, `is_active` filter, array-search 422, failed-search preservation); Vitest suite rewritten against a real QueryClient; Pint/ESLint/TS clean; 6 review threads resolved; PR ready, merge pending |
| ✅ | #530 | Aligned all live documentation to the PHP 8.5 runtime — updated the README PHP badge + stack table, `CLAUDE.md`, `RESUME_STATUS.md`, and 4 backend convention scope headers + `api-rules.md` (10 references) from 8.2/8.3 to 8.5; `doc/tasks/**` archives and `composer.json` (`^8.2`) intentionally untouched | PR #531 | 2.1h | opportunistic doc-only follow-up per §5.4 from the Sprint 005 review; no code, tests, or Swagger affected; verified with `grep -rniE "php[ _-]?8\.[0-3]" --include="*.md"` returning only archive hits; 0 review threads, CI green; PR ready, merge pending |

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Stock corrections | Duplicated fields/incomplete reversal | Immutable linked compensating movements | — | ⏳ |
| Replenishment | Global Variant thresholds | Location-specific resolved policy | — | ⏳ |
| Horizontal access | Capability without complete membership scope | Operating Unit isolation across Inventory | — | ⏳ |
| Inventory navigation | Overlapping/stale paths | One entry point per operational concept | — | ⏳ |
| Legacy sources | Multiple active fields/contracts | Reconciled replacement or explicit archive decision | — | ⏳ |

## 15. Results

### 15.1 Delivered Value

Not yet delivered. Expected value is a complete, auditable, location-aware, horizontally authorized
Inventory module with no competing legacy workflow or source of truth.

### 15.2 Planned vs. Actual

- Planned: 5 Issues, 24h–48h.
- Completed: 0.
- Tracked: no sessions yet.

### 15.3 Known Limitations

- Promotion requires completed replacement domains from Sprints 4–5.
- This sprint closes the current Inventory roadmap, not unrelated deferred project debt.
- Data reconciliation may reveal follow-ups that must be recorded instead of hidden in cleanup.

## 16. Lessons Learned

Planning lesson: deletion is the final migration operation, not the redesign strategy. Replacement,
parity, reconciliation, and rollback evidence must exist before removing a legacy source.

## 17. Follow-up Work

| Status | Issue | Work | Candidate Sprint |
|---|---:|---|---|
| ⏳ | TBD | Any reconciliation gap discovered during #442 | Backlog / Sprint 007 only if evidence requires it |
| ✅ | #506 | Replace the supplier-offering form's product/variant `<select>`s with a searchable/paginated combobox — deferred from `#431`'s PR #496 review; moved here from a stale `sprint-5` label after Sprint 005 closed with it still open. Delivered via PR #523 (server-side search, see §13) | Sprint 006 |
| ✅ | #530 | Align documentation PHP version references with the 8.5 runtime — Sprint 005 review flagged docs still stating PHP 8.2/8.3 while `docker/app/Dockerfile` and CI already run 8.5. Opportunistic (§5.4), doc-only. Delivered via PR #531 (see §13) | Sprint 006 |

## 18. Sprint Closure Checklist

- [x] All five Issues are linked, labeled `sprint-6`, and assigned to Sprint 6.
- [ ] Every Issue has a final status and PR/commit evidence.
- [ ] Scope changes and tracked Sessions are synchronized.
- [ ] Estimates, wall-clock time, parallelism, and quality results are finalized.
- [ ] Dependencies, conflicts, delivered value, limitations, and lessons reflect execution.
- [ ] Reconciliation proves safe legacy removal and follow-ups are filed.
