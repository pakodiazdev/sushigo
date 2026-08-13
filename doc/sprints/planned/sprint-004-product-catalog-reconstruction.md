---
sprint: "004"
title: Product Catalog Reconstruction
status: Planned

created: 2026-08-12
started:
completed:
last_updated: 2026-08-12

base_branch: main
base_commit: ace93c8
scope_issues: 8

github_project: SushiGo Admin (#7)
github_milestone:

previous: sprint-003-development-platform-and-product-reliability.md
next:
---

# Sprint 004 — Product Catalog Reconstruction

> Deliver one usable Product → Variant → Purchase Presentation catalog, seeded with representative
> SushiGo data, and retire the competing legacy Product wizard.

## 1. Executive Summary

Sprint 004 is projected as a focused application sprint containing eight Issues from
`pakodiazdev/sushigo`: `#422` through `#429`. Together they deliver a complete catalog vertical
rather than isolated backend work: Product identity with Brand and Inventory Category, progressive
Product creation and detail, embedded Variants, reusable Purchase Presentations, realistic seed
data, and removal of the superseded wizard and catalog paths.

The selected scope represents **32h optimistic / 60h pessimistic** of engineering effort. It is
organized into five dependency-aware rounds because every later layer builds on the catalog
contracts established before it. Backend and frontend work run in parallel only where their
contracts and file ownership make that safe.

This sprint intentionally stops at catalog configuration. Supplier offerings, purchases,
acquisition cost, Stock balances, branch-aware sale prices, and the remaining Inventory cleanup are
deferred to later roadmap Issues. Product creation therefore remains free of cost, price, opening
balance, location, and transactional purchase data.

## 2. Context

The current Inventory catalog couples Product, Variant, price, cost, stock, location, and unit
conversion in a wizard. That interaction makes a single creation flow responsible for independent
domains and can leave partial or conceptually incorrect configuration when a later step fails.

The target workflow creates Product identity first. After persistence, the same SlidePanel becomes
the Product detail and progressively exposes its Variant catalog. Each Variant then owns its
inventory identity and can be assigned reusable commercial Purchase Presentations such as Unit,
Pack x6, Box x12, or Box x24. Those presentations normalize packages to the Variant's base
inventory unit without pretending that every box has a universal physical-UOM conversion.

Sprint 003 Issue `#421` is the mandatory design gate for this implementation. Sprint 004 may start
only after that Issue produces an approved target architecture, UI/API contract, and incremental
migration plan. If its decision changes the assumptions in `#422`–`#429`, the affected Issue bodies,
estimates, dependencies, and this document must be updated before Sprint 004 is promoted.

Sprint 004 is configured in SushiGo Admin for **2026-09-06 through 2026-09-19**. This document
remains under `doc/sprints/planned/` until Sprint 003 is closed and Sprint 004 is promoted according
to `doc/conventions/sprints.md`.

## 3. Sprint Goal

**Sprint Goal:** Replace the coupled Inventory catalog wizard with a tested, progressive Product →
Variant → Purchase Presentation workflow that is usable end to end, includes realistic SushiGo
seed data, and leaves financial and Stock operations in their correct later domains.

## 4. Sprint Timeline

| Metric | Value |
|---|---:|
| Created | 2026-08-12 |
| Planned start | 2026-09-06 |
| Planned end | 2026-09-19 |
| Started | — |
| Completed | — |
| Target calendar duration | 14 days |
| Active workdays | — |

## 5. Scope

### 5.1 Included

- Product, Brand, and Inventory Category backend contracts (`#422`).
- Progressive Product create/edit/detail SlidePanel replacing the four-step wizard (`#423`).
- Product-scoped Variant backend around SKU, barcode, base UOM, and active state (`#424`).
- Embedded Variant catalog and CRUD inside Product detail (`#425`).
- Reusable Purchase Presentation templates and Variant assignments (`#426`).
- Purchase Presentation management inside embedded Variant detail (`#427`).
- Deterministic Testing, volume Fakes, and realistic Development seeders (`#428`).
- Removal of ProductWizard and superseded catalog UI/contracts (`#429`).

### 5.2 Excluded

- Implementation before Sprint 003 design gate `#421` is approved.
- Supplier offerings and purchase-contract design (`#431`).
- Purchase receipts, promotions, acquisition-cost calculation, and receiving UI (`#432`–`#434`).
- Branch-aware price lists and price-management UI (`#435`–`#437`).
- Remaining Stock movement, replenishment, authorization, navigation, and schema cleanup
  (`#438`–`#442`).
- Writing cost, sale price, Stock, opening balance, location, or supplier data from Product or
  Variant forms.
- Adding Insumo or Activo verticals; the shared backend may support them later through adapted UI.
- Unrelated pending technical debt such as `#399`, `#415`, `#276`, and `#85`.

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| — | — | — | None yet | Sprint not started |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| — | — | — | None yet | — |

## 6. Value Ranking

| Tier | Issues | Rationale |
|---|---|---|
| **Critical** | `#422`, `#424`, `#426` | Establish the canonical Product, Variant, and package-normalization contracts required by every user-facing workflow |
| **High** | `#423`, `#425`, `#427` | Turn the contracts into a complete progressive catalog operators can actually use |
| **Medium** | `#428`, `#429` | Make the vertical demonstrable and remove stale paths that could continue writing invalid catalog data |
| **Deferred** | `#431`–`#442` | Extend the catalog into purchasing, pricing, and final Stock hardening in later sprints |

### Ordering principle

> Approve the design, stabilize each backend contract, expose it through the progressive UI, prove
> the full catalog with representative data, and only then delete the legacy workflow.

## 7. Route A — Execution Rounds

### Round 1 — Establish Product Identity

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #422 | Build Product catalog contract with Brands and Inventory Categories | Critical | 5h | 9h | — | — | Starts only after #421 approval |
|  |  | **Round total** |  | **5h** | **9h** | **—** |  |  |

### Round 2 — Expose Products and Define Variants

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #423 | Replace Product wizard with progressive create-and-detail SlidePanel | High | 5h | 9h | — | — | Frontend lane; consumes #422 |
| ⏳ | #424 | Redesign Product Variants around inventory identity | Critical | 3h | 6h | — | — | Backend lane; consumes #422 and coordinates with #399 |
|  |  | **Round total** |  | **8h** | **15h** | **—** |  |  |

### Round 3 — Embed Variants and Model Purchase Presentations

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #425 | Add embedded Variant catalog and CRUD to Product detail | High | 4h | 8h | — | — | Requires #423 and #424 |
| ⏳ | #426 | Model reusable Purchase Presentations and Variant assignments | Critical | 5h | 9h | — | — | Backend lane after #424 |
|  |  | **Round total** |  | **9h** | **17h** | **—** |  |  |

### Round 4 — Complete the Usable Catalog and Its Data

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #427 | Add Purchase Presentation management to Variant detail | High | 4h | 7h | — | — | Frontend lane; requires #425 and #426 |
| ⏳ | #428 | Seed realistic Products, Variants, and Purchase Presentations | Medium | 3h | 6h | — | — | Backend/data lane; requires #422, #424, and #426 |
|  |  | **Round total** |  | **7h** | **13h** | **—** |  |  |

### Round 5 — Retire the Competing Workflow

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ⏳ | #429 | Remove legacy Product wizard and superseded catalog UI | Medium | 3h | 6h | — | — | Runs only after replacement UI and seed evidence are green |
|  |  | **Round total** |  | **3h** | **6h** | **—** |  |  |

## 8. Route B — Sequential Dependencies

```text
#421 (Sprint 3 design gate)
  → #422 Product contract
      → #423 Product UI
      → #424 Variant contract
          → #425 embedded Variant UI
          → #426 Purchase Presentation contract
              → #427 Presentation UI
              → #428 catalog seeders
                  → #429 legacy cleanup
```

`#423` and `#424` may run in parallel after `#422`; one owns the Product frontend and the other the
Variant backend. `#425` and `#426` may also run in parallel after the Variant contract is stable.
`#427` and `#428` form the last safe parallel pair: presentation UI and deterministic backend/data
fixtures. `#429` is intentionally last because deletion is safe only when the replacement workflow
and its representative data have passed their gates.

## 9. Conflict Risk Map

| Shared area | Issues | Planned rounds | Risk / Coordination |
|---|---|---|---|
| Item/Product schema, models, API resources, permissions | `#422`, `#424`, `#426`, `#428` | 1–4 | Sequence migrations/contracts; later work consumes rather than redefines earlier boundaries |
| Product page, API client, types, hooks, SlidePanel | `#423`, `#425`, `#427`, `#429` | 2–5 | Sequential frontend ownership avoids competing nested-panel state and cache contracts |
| Variant schema/API | `#424`, `#426`, `#428` | 2–4 | Establish Variant contract before presentation assignments and seed data |
| Seed configuration and database seeders | `#428` | 4 | Single owner; must consume canonical APIs/models and remain idempotent |
| Inventory routes/navigation and old wizard exports | `#423`, `#429` | 2, 5 | Create replacement first; delete redirects and stale entry points last |
| Public-ID convention | `#424`, backlog `#399` | 2 | Coordinate explicitly; Sprint 4 must not introduce an incompatible convention |

## 10. Estimate Tracking by Round

| Round | Issue count | Opt. total | Pess. total | Tracked total | vs Opt. | vs Pess. |
|---|---:|---:|---:|---:|---:|---:|
| Round 1 | 1 | 5h | 9h | — | — | — |
| Round 2 | 2 | 8h | 15h | — | — | — |
| Round 3 | 2 | 9h | 17h | — | — | — |
| Round 4 | 2 | 7h | 13h | — | — | — |
| Round 5 | 1 | 3h | 6h | — | — | — |
| **Sprint total** | **8** | **32h** | **60h** | **—** | **—** | **—** |

## 11. Consolidated Time Tracking

| Category | Estimated | Tracked | Variance |
|---|---:|---:|---:|
| Product catalog contract and UI (`#422`, `#423`) | 10h–18h | — | — |
| Variant contract and embedded UI (`#424`, `#425`) | 7h–14h | — | — |
| Purchase Presentations backend and UI (`#426`, `#427`) | 9h–16h | — | — |
| Seed data (`#428`) | 3h–6h | — | — |
| Legacy cleanup (`#429`) | 3h–6h | — | — |
| **Sprint total** | **32h–60h** | **—** | **—** |

### Wall-Clock Time & Parallelism

Computed at sprint closure from finalized Issue session arrays, following
`doc/conventions/sprints.md` §7.

- **Person-hours:** —
- **Wall-clock time:** —
- **Parallelization factor:** —
- **Peak concurrency:** —

| Wall-clock block | Duration | Issues active in this block |
|---|---:|---|
| — | — | No sessions yet |

## 12. Notes on Estimate Confidence

Confidence is **medium**. Issue boundaries and dependencies are explicit, but `#421` can still
re-scope schema or migration decisions before Sprint 4 begins. The estimates assume incremental
migration over the shared Item model, reuse of the media system from `#377`/`#378`, no financial or
Stock-domain implementation, and no broad delivery of technical-debt Issue `#399`.

The largest uncertainty is the nested Product/Variant/Presentation UI state across `#423`, `#425`,
and `#427`. The plan sequences those Issues so each can stabilize cache, accessibility, and panel
behavior before the next layer consumes it. All eight Issue bodies contain optimistic/pessimistic
estimates and empty Sessions arrays ready for execution tracking.

## 13. Execution Evidence

| Status | Issue | Result Summary | Pull Request | Merge Commit | Tracked | Evidence Notes |
|---|---:|---|---:|---|---:|---|
| ⏳ | #422 | Pending | — | — | — | Product/Brand/Category contract after #421 |
| ⏳ | #423 | Pending | — | — | — | Progressive Product SlidePanel |
| ⏳ | #424 | Pending | — | — | — | Product-scoped Variant contract |
| ⏳ | #425 | Pending | — | — | — | Embedded Variant workflow |
| ⏳ | #426 | Pending | — | — | — | Reusable Purchase Presentation contract |
| ⏳ | #427 | Pending | — | — | — | Embedded Presentation management |
| ⏳ | #428 | Pending | — | — | — | Testing/Fakes/Development catalog data |
| ⏳ | #429 | Pending | — | — | — | Legacy wizard and stale catalog paths removed |

## 14. Quality Results

| Metric | Before | Target | After | Result |
|---|---:|---:|---:|---|
| Product creation entry points | Coupled wizard and overlapping catalog paths | One progressive Product catalog entry point | — | ⏳ |
| Product create payload | Mixes identity with operational/financial fields | Identity, classification, media, and active state only | — | ⏳ |
| Variant management | Disconnected/global and financially coupled | Product-scoped CRUD inside Product detail | — | ⏳ |
| Commercial packaging | Ambiguous use of global UOM conversion | Reusable compatible Purchase Presentation templates | — | ⏳ |
| Representative catalog data | Legacy/incomplete Product story | Deterministic Coca-Cola, Buldak, Peelez, Ramune, and Mochis examples | — | ⏳ |
| Relevant tests and gates | TBD | 100% relevant API, component, E2E, and quality checks passing | — | ⏳ |

## 15. Results

### 15.1 Delivered Value

Not yet delivered. Expected value is a coherent catalog that operators can use from Product
creation through Variant and Purchase Presentation configuration without entering transactional
cost, sale price, Stock, or opening balances.

### 15.2 Planned vs. Actual

- **Planned Issues:** 8.
- **Estimate:** 32h optimistic / 60h pessimistic.
- **Completed:** 0.
- **Deprecated or cancelled:** 0.
- **Tracked:** no sessions yet.

### 15.3 Known Limitations

- Sprint 004 cannot start until `#421` is approved and Sprint 003 is closed.
- The completed catalog will not yet receive purchases or resolve acquisition cost/sale price.
- Seeders demonstrate reusable catalog definitions only; operational suppliers, receipts, costs,
  Stock, and branch prices belong to later Issues.
- The estimate is engineering effort, not elapsed time; five dependency rounds constrain the
  maximum useful parallelism.

## 16. Lessons Learned

Planning lesson: catalog identity, operational packaging, transaction cost, sale price, and Stock
are related but distinct lifecycle boundaries. Delivering them as separate verticals avoids another
wizard that creates partial state and gives each sprint an independently testable outcome.

Additional lessons will be added from execution evidence.

## 17. Follow-up Work

| Status | Proposed Issue | Title | Reason | Candidate Sprint |
|---|---:|---|---|---|
| ⏳ | #431–#434 | Supplier offerings, Purchase Receipts, receiving UI, and acquisition cost | Consume the stable Purchase Presentation and Stock mutation contracts | Sprint 005+ |
| ⏳ | #435–#437 | Branch-aware price lists, UI, and operational seed data | Sale price belongs outside Product/Variant catalog identity | Future |
| ⏳ | #438–#442 | Stock movement, replenishment, access, navigation, and final schema cleanup | Finish Inventory hardening after replacement domains exist | Future |

## 18. Sprint Closure Checklist

- [x] Eight Issues selected as one end-to-end catalog vertical.
- [x] Every included Issue is linked to SushiGo Admin, labeled `sprint-4`, and assigned to the
      `Sprint 4` iteration.
- [ ] Sprint 003 design gate `#421` was approved and any resulting re-scope recorded.
- [ ] All included work items have a final status marker.
- [ ] Completed items include Pull Request or commit evidence.
- [ ] Deprecated or cancelled items include replacement/reason.
- [ ] Scope changes and opportunistic work are recorded.
- [ ] Tracked time was synchronized from Issue Sessions arrays.
- [ ] Round totals, sprint totals, and estimate variance were recalculated.
- [ ] Wall-clock time, parallelization factor, and peak concurrency were computed.
- [ ] Dependencies and conflict notes reflect actual execution.
- [ ] Relevant tests, E2E scenarios, and quality metrics were recorded.
- [ ] Delivered value and known limitations were documented.
- [ ] Follow-up work and lessons learned were captured.
- [ ] Metadata dates/status were updated and the next sprint was created when applicable.
