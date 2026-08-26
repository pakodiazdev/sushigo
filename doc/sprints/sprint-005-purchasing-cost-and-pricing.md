---
sprint: "005"
title: Purchasing, Cost & Pricing
status: In Progress

created: 2026-08-12
started: 2026-08-22
completed:
last_updated: 2026-08-26

base_branch: main
base_commit: a6f153bc
scope_issues: 7

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-004-product-catalog-reconstruction.md
next: sprint-006-stock-integrity-and-inventory-completion.md
---

# Sprint 005 — Purchasing, Cost & Pricing

> Turn the Product catalog into an operational commercial flow: configure suppliers, receive
> packages, calculate effective acquisition cost, and resolve branch-aware sale prices.

## 1. Executive Summary

Sprint 005 contains `#431`–`#437`, a seven-Issue vertical estimated at **36h optimistic / 67h
pessimistic**. It builds Supplier offerings over the Purchase Presentations delivered in Sprint 4,
adds immutable Purchase Receipts and receiving UI, unifies weighted-average acquisition cost, adds
effective branch-aware price lists and UI, and proves the complete story with operational seed data.

The outcome is usable functionality rather than backend scaffolding: operators can record what was
actually bought, including paid/bonus packages and expenses, inspect the resulting effective unit
cost, and configure distinct sale prices by branch or approved operating context.

## 2. Context

Sprint 4 deliberately keeps catalog identity free of supplier, cost, price, Stock, and transaction
data. Sprint 5 consumes that stable Product → Variant → Purchase Presentation model and the
concurrency-safe Stock mutation contract from `#430` to implement the next lifecycle boundary.

Cost belongs to the purchase evidence that produced it, not the Product form. Sale price belongs to
an effective operational context, not a global Variant fallback. This sprint groups both domains
because the final seed and demonstration flow must explain how package, supplier, promotion,
expense, acquisition cost, and branch price differ without conflating them.

The SushiGo Admin Iteration is scheduled for **2026-09-20 through 2026-10-03**. Promotion requires
Sprint 4 completion and verified compatibility with its final Presentation contracts.

## 3. Sprint Goal

**Sprint Goal:** Deliver auditable purchase receiving and branch-aware pricing end to end, with one
authoritative acquisition-cost source and deterministic operational data.

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | 2026-08-12 |
| Planned start | 2026-09-20 |
| Planned end | 2026-10-03 |
| Started | 2026-08-22 (promoted early from planned by `#493`) |
| Completed | — |
| Progress (Issues completed) | 7 / 7 (100%) as of 2026-08-26 — `#431` (PR #496), `#432` (PR #512), `#433` (PR #515), `#434` (PR #514), `#435` (PR #502), `#436` (PR #511) and `#437` (PR #516) all merged to `main` |
| Target calendar duration | 14 days |
| Active workdays | — |

## 5. Scope

### 5.1 Included

- Suppliers and purchasable Variant Presentation offerings (`#431`).
- Purchase Receipt posting, promotions, expenses, and effective unit cost (`#432`).
- Purchase receiving UI and canonical cost preview (`#433`).
- One weighted-average acquisition-cost source across Variant, Stock, and reports (`#434`).
- Effective branch/operating-context price lists (`#435`).
- Price-list management UI (`#436`).
- Deterministic Suppliers, Receipts, costs, and branch-price seed data (`#437`).

### 5.2 Excluded

- Product/Variant/Presentation catalog reconstruction (`#422`–`#429`), completed first in Sprint 4.
- Stock movement normalization, replenishment policies, horizontal access, navigation, and final
  legacy cleanup (`#438`–`#442`), assigned to Sprint 6.
- A Product or Variant form fallback for cost or sale price.
- Redis-dependent price resolution or speculative promotion/channel engines.
- Deferred technical debt `#85`, `#276`, and `#415`.

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| 2026-08-23 | Added | #399 | Included opportunistically after the Inventory public-ID rollout was completed | The identifier migration landed before #431 and now supplies its Supplier/Presentation boundary |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| 2026-08-22 | #493 | Promote Sprint 005 and formally close Sprint 004 | Sprint 004 closure checklist was complete | Sprint 005 activated and both sprint indexes synchronized |
| 2026-08-23 | #399 | Migrate Inventory external identifiers to public IDs | Required foundation was completed while preparing purchasing work | PR #495 merged with all 21 CI checks passing, review threads resolved, and clean Sonar quality gates |

## 6. Value Ranking

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | `#432`, `#434` | Purchase posting and authoritative acquisition cost directly affect Stock value and margins |
| **High** | `#431`, `#433`, `#435`, `#436` | Complete supplier, receiving, and branch-price functionality for operators |
| **Medium** | `#437` | Demonstrate and regression-test the full operational story |
| **Deferred** | `#438`–`#442` | Final Stock hardening follows in Sprint 6 |

### Ordering principle

> Stabilize supplier offerings, post purchases through atomic Stock mutation, reconcile cost, add
> pricing, and seed only after every canonical calculation exists.

## 7. Route A — Execution Rounds

### Round 1 — Supplier and Price Foundations

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #431 | Build Suppliers and purchasable Variant Presentations | High | 5h | 9h | 1.1h | PR #496 / `7b307c29` | Supplier/Offering catalog, permissions, Spanish UI at `/inventario/proveedores`, and review-hardening fixes — merged to `main` (`7b307c29`) |
| ✅ | #435 | Build effective Product price lists by branch/context | High | 6h | 11h | 4.75h | PR #502 / `1be184da` | Deterministic price resolution + overlap validation shipped; merged to `main` (`1be184da`) |
| ✅ | #399 | Migrate Inventory external identifiers to public IDs | Opportunistic | 0h | 0h | 0h | PR #495 / `563bfd4a` | Added during Sprint 005; no Issue session was recorded |
|  |  | **Round total** |  | **11h** | **20h** | **—** |  |  |

### Round 2 — Post Purchases and Manage Prices

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #432 | Receive Product Presentations and calculate effective unit cost | Critical | 7h | 13h | 8.77h | PR #512 / `bee8316c` | Purchase Receipts, atomic post/reverse reusing #430's Stock mutation, review-hardening fixes — merged to `main` (`bee8316c`) |
| ✅ | #436 | Add branch-aware price-list management UI | High | 5h | 9h | 12.9h | PR #511 / `2e07c320` | Price List/Assignment/Variant Price management UI with resolved-price preview shipped; merged to `main` (`2e07c320`) |
|  |  | **Round total** |  | **12h** | **22h** | **—** |  |  |

### Round 3 — Complete Receiving and Reconcile Cost

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #433 | Add purchase receiving UI and cost preview | High | 6h | 11h | 2.92h | PR #515 / `e006d4bb` | Receipt list/create-edit-draft/immutable posted-reversed detail UI shipped, preview matches #432's formula exactly, 5 review threads + 3 manually-found bugs resolved, 2 SonarCloud smells cleaned up — merged to `main` (`e006d4bb`) |
| ✅ | #434 | Unify weighted-average acquisition cost | Critical | 4h | 8h | 1.3h | PR #514 / `8c85d231` | Stock.weighted_avg_cost (per Inventory Location) is now the single source, exact-decimal via bcmath, legacy Variant fields frozen and reconciled — merged to `main` (`8c85d231`) |
|  |  | **Round total** |  | **10h** | **19h** | **—** |  |  |

### Round 4 — Prove the Operational Story

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #437 | Seed Suppliers, Receipts, costs, and branch prices | Medium | 3h | 6h | 2.63h | PR #516 / `675ac99c` | Development/Testing/Fakes Supplier, Receipt (bonus packages + freight, weighted-avg cost) and Pricing (branch-context + promotion) seeders shipped, 7 review threads + 1 SonarCloud smell resolved — merged to `main` (`675ac99c`) |
|  |  | **Round total** |  | **3h** | **6h** | **—** |  |  |

## 8. Route B — Sequential Dependencies

```text
#431 → #432 → #433
          └→ #434
#435 → #436
#431 + #432 + #433 + #434 + #435 + #436 → #437
```

Supplier and pricing foundations can run in parallel. Purchase posting must precede its UI and cost
reconciliation. Operational seed data is last because it validates the canonical calculations and
both visible workflows rather than inventing interim behavior.

## 9. Conflict Risk Map

| Shared area | Issues | Rounds | Coordination |
|---|---|---|---|
| Supplier/Presentation API and receipt services | `#431`, `#432`, `#437` | 1, 2, 4 | Sequential contract consumption |
| Stock cost fields/services/reports | `#432`, `#434`, `#437` | 2–4 | Reconcile one source before seed assertions |
| Receiving API types and UI | `#432`, `#433` | 2, 3 | Backend contract first |
| Price-list API/types/UI | `#435`, `#436`, `#437` | 1, 2, 4 | Backend then UI then seed evidence |
| Seeder configuration | `#437` | 4 | Single final owner |

## 10. Estimate Tracking by Round

| Round | Issues | Opt. | Pess. | Tracked | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 2 | 11h | 20h | — | — | — |
| 2 | 2 | 12h | 22h | — | — | — |
| 3 | 2 | 10h | 19h | — | — | — |
| 4 | 1 | 3h | 6h | — | — | — |
| **Total** | **7** | **36h** | **67h** | **—** | **—** | **—** |

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Suppliers and purchasing (`#431`–`#433`) | 18h–33h | — | — |
| Acquisition-cost reconciliation (`#434`) | 4h–8h | — | — |
| Branch-aware pricing (`#435`, `#436`) | 11h–20h | — | — |
| Operational seed data (`#437`) | 3h–6h | — | — |
| **Total** | **36h–67h** | **—** | **—** |

### Wall-Clock Time & Parallelism

- **Person-hours:** —
- **Wall-clock time:** —
- **Parallelization factor:** —
- **Peak concurrency:** —

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| — | — | No sessions yet |

## 12. Notes on Estimate Confidence

Confidence is **medium**. Boundaries and formulas are scoped in the Issues, but purchase posting and
cost migration carry meaningful database/concurrency risk. Estimates assume Sprint 4 contracts and
`#430` remain stable, exact-decimal money handling is preserved, and no unrelated pricing engine is
introduced.

## 13. Execution Evidence

| Status | Issue | Result | Pull Request | Merge Commit | Tracked | Notes |
|---|---:|---|---:|---|---:|---|
| ✅ | #399 | Inventory public-ID rollout delivered | PR #495 | `563bfd4a` | 0h | 21/21 CI checks passed; review threads resolved; Sonar clean |
| ✅ | #431 | Supplier and Supplier Offering catalog delivered — CRUD/list/filter APIs, permissions, and a Spanish management UI at `/inventario/proveedores`, migrated into the domain-oriented `src/features/purchasing/suppliers/` structure, with quotations kept reference-only | PR #496 | `7b307c29` | 1.1h | 26 review threads resolved across 6 rounds (TOCTOU races on Supplier/Offering create+update, decimal/integer column-boundary validation, inactive variant/product/presentation checks, empty-to-null normalization, null-safe UI fallbacks); PHPUnit + Vitest + Cypress green, ESLint/Pint clean |
| ✅ | #432 | Purchase Receipts (`receipts`/`receipt_lines`) with draft/posted/reversed lifecycle, atomic post/reverse reusing #430's `StockMutationService` lock/race pattern, and immutable cost-snapshot evidence (`presentation_factor`, `net_acquisition_amount`, `base_units_received`, `effective_unit_cost`) | PR #512 | `bee8316c` | 8.77h | 29 PHPUnit tests, Pint clean, SonarCloud quality gate passed (0 new smells/bugs/hotspots, 97.9% new coverage); 11 Copilot/Codex review threads resolved (soft-delete validation gaps, offering/supplier/presentation cross-check, negative-net-amount guard, destination-soft-delete races at post and on serialization, delete/post concurrency race, migration-rollback safety) |
| ✅ | #433 | Purchase Receipt UI delivered at `/inventario/recepciones-de-compra` — list, create/edit draft with cascading Product→Variant→Presentation→Supplier Offering selects and a live preview mirroring `ReceiptService::createLine()` exactly, immutable posted/reversed detail with post/reverse confirmations | PR #515 | `e006d4bb` | 2.92h | 44 Vitest tests (calc helper, API client, every hook, form/details/page components, ~90% coverage) plus a Cypress happy-path spec covering the full DRAFT→POSTED→REVERSED lifecycle; manually verified end-to-end against the running dev-lab stack; 5 Copilot/Codex review threads resolved (3 real bugs: permission-alignment gap mirroring #505, product-catalog pagination, stale supplier-offering on Supplier change) plus a Devin-flagged variant-catalog pagination bug of the same shape and 2 more manually-found bugs (blank optional cost fields, wrong Cypress assertion text); SonarCloud quality gate passed on both api and webapp with 0 new code smells (2 nested-ternary smells cleaned up via `/sonar-review`); ESLint/TypeScript clean |
| ✅ | #434 | Unified weighted-average acquisition cost onto `Stock.weighted_avg_cost` per Inventory Location — `WeightedAverageCostCalculator` (bcmath exact-decimal) centralizes the blend for Receipts and Opening Balance, `StockOutService`/stock-out UI read the location-scoped cost, and a backfill migration reconciles stale `ItemVariant.avg_unit_cost` | PR #514 | `8c85d231` | 1.3h | 8 new/updated PHPUnit tests + 1 Vitest test, Pint clean; 6 Copilot/Codex review threads resolved across 2 rounds (undeclared ext-bcmath dependency, float division in reconciliation, flaky float assertion, a P1 pre-existing-stock zero-cost data-loss bug, explicit-zero-cost blend gap, stale frontend cost source) |
| ✅ | #435 | Effective-dated PriceList/PriceListAssignment/VariantPrice schema, deterministic resolution API, branch-scoped authorization and permissions shipped, with no ItemVariant.sale_price fallback | PR #502 | `1be184da` | 4.75h | 56 PHPUnit tests, Pint clean, SonarCloud quality gate passed (0 new smells/bugs/hotspots, 93.8% new coverage); 3 rounds of Copilot/Codex review addressed (18 threads resolved) |
| ✅ | #436 | Price List / Assignment / Variant Price management UI delivered at `/inventario/listas-de-precios` — paginated DataGrid, create/edit/detail SlidePanels, Assignment delete-and-recreate flow, and a resolved-price preview matching the backend | PR #511 | `2e07c320` | 12.9h | 145+ Vitest tests across API/hooks/forms/sections plus a Cypress happy path; 13 review threads resolved across 3 rounds (Copilot domain-structure relocation, Codex pagination/permission-alignment bugs, missing Assignment delete flow); SonarCloud quality gate passed (0 new smells/bugs/hotspots, 84.9% new coverage); ESLint/typecheck clean |
| ✅ | #437 | Development/Testing/Fakes purchasing story delivered — Suppliers quoting the same Purchase Presentation at different prices, a posted Receipt demonstrating package normalization + bonus packages + an allocated freight expense driving weighted-average Stock cost, and Standard vs. event-Operating-Unit vs. time-boxed-promotion `PriceList`s, all `ApplicationClock`-anchored for idempotent/time-stable re-seeding | PR #516 | `675ac99c` | 2.63h | 16 PHPUnit tests (52 assertions) across 4 new test files plus `TestReset` `purchasing`/`fakes-purchasing` groups; full `migrate:fresh --seed` run verified end-to-end; 7 Copilot/Codex review threads resolved (5 fixed: `ApplicationClock` vs. `Carbon::now()`, a `withTrashed()` idempotency gap, 3 unchecked `first()` lookups, an unused config key — 1 skipped as matching an existing `ItemVariantFactory` precedent); 1 SonarCloud code smell fixed (return-count refactor); Pint clean |

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---|---|---|---|
| Purchase evidence | Manual conversions/no canonical receipt | Immutable posted receipt with exact calculations | — | ⏳ |
| Acquisition cost | Competing Variant/Stock sources | One reconciled weighted-average source | — | ⏳ |
| Sale price | Global Variant assumption | Effective deterministic branch/context resolution | — | ⏳ |
| Operational data | Catalog-only examples | Suppliers, promotion, receipt, cost, and branch-price story | — | ⏳ |

## 15. Results

### 15.1 Delivered Value

Not yet delivered. Expected value is an auditable purchase-to-Stock-cost flow plus locally resolved
sale prices that operators can configure and inspect.

### 15.2 Planned vs. Actual

- Planned: 7 Issues, 36h–67h.
- Completed: 0 planned Issues; 1 opportunistic Issue (`#399`).
- Tracked: 0h for `#399`; no planned-Issue sessions completed yet.

### 15.3 Known Limitations

- Sprint 5 depends on Sprints 3–4 and cannot be safely promoted early.
- Final Stock movement, replenishment, access, navigation, and schema cleanup remains in Sprint 6.
- Promotion/discount engines beyond receipt evidence are out of scope.

## 16. Lessons Learned

Planning lesson: cost must be derived from immutable purchase evidence, while price must resolve
from operational context. Keeping them outside the Product catalog prevents competing defaults.

## 17. Follow-up Work

| Status | Issues | Work | Candidate Sprint |
|---|---:|---|---|
| ⏳ | #438–#442 | Stock integrity and final Inventory completion | Sprint 006 |

## 18. Sprint Closure Checklist

- [x] All seven Issues are linked, labeled `sprint-5`, and assigned to Sprint 5.
- [ ] Every Issue has a final status and PR/commit evidence.
- [ ] Scope changes and tracked Sessions are synchronized.
- [ ] Estimates, wall-clock time, parallelism, and quality results are finalized.
- [ ] Dependencies, conflicts, delivered value, limitations, and lessons reflect execution.
- [ ] Sprint 6 is promoted when applicable.
