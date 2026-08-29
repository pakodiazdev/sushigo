# 🔨 Remove legacy Inventory fields and reconcile architecture documentation

**Labels:** documentation, backend, 🔨 technical-debt, sprint-6, investment: product-engineering

## Description

Remove legacy Inventory schema/contracts only after replacement consumers and migrations are verified, then reconcile all architecture and API documentation.

## Reason

Keeping Item SKU and Variant cost/sale/min/max fields indefinitely preserves multiple sources of truth; deleting them early would lose data or break still-active workflows.

## Objective

Complete evidence-backed legacy removal with no stale code, schema, seeder, test or documentation assertions.

## ✅ Technical Tasks

- [x] Inventory every remaining reader/writer of Item SKU and legacy Variant cost/sale/min/max fields.
- [x] Reconcile and migrate data to Product SKU ownership, acquisition cost, price lists and replenishment policies.
- [x] Drop/deprecate columns only after parity and rollback evidence are recorded.
- [x] Delete obsolete controllers, requests, resources, seeders, factories, tests and old design assertions.
- [x] Update Spanish/English Inventory architecture, ERD, Swagger, permissions and examples.
- [x] Run final schema/data reconciliation and full relevant quality gates.

## 🎯 Acceptance Criteria

- [x] No active code reads or writes a dropped legacy field.
- [x] Every removed source has a verified replacement or an explicit archival decision.
- [x] Architecture, API docs, seeders and UI terminology describe the implemented system.
- [x] Migration evidence proves existing Product/Stock value is preserved.

## 🔗 References

- Depends on #429, #434, #436, #439 and #441

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `8h` · **Tracked:** `1h23m`

### 📅 Sessions
```json
[
  { "date": "2026-08-27", "start": "20:49", "end": "21:16" },
  { "date": "2026-08-28", "start": "20:10", "end": "21:06" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 23m (27m + 56m)
- **vs optimistic:** −2h 37m
- **vs pessimistic:** −6h 37m

**Justification:**
The first session (27m) was a mostly mechanical removal: the four prerequisite issues
(#429/#434/#436/#439/#441) had already stood up the replacement write paths
(`Stock.weighted_avg_cost`, `VariantPrice` price lists, per-location replenishment policies),
application code had already stopped writing the legacy `item_variants` cost/price columns, and
`#439` had already dropped `min_stock`/`max_stock`. That left the drop migration, stripping field
handling from ~13 API classes and the legacy INSUMO/ACTIVO variant UI, cleaning fixtures, and
reconciling four architecture docs plus TD-03. The one judgment call — keeping `items.sku`
(authoritative for INSUMO/ACTIVO per merged #500, contradicting `product-catalog-architecture.md`
§7.8's stale "drop `Item.sku`" line) — was resolved from the docs without a data migration.

The second session (56m) was entirely review-response and verification, not new scope. A full
local Cypress run surfaced 18 failing specs; four inventory-adjacent ones were re-run on
`origin/main` and failed identically, confirming pre-existing workspace-local E2E flakiness rather
than a regression (CI's sharded Cypress gate is green). Two review findings then drove two
migration rewrites: first "aggregate-only logging makes legacy values unrecoverable on rollback"
(→ `up()` now stashes exact per-row values so `down()` is lossless), then "stashing into `meta`
exposes the archived prices through the `/item-variants` list endpoint" (→ moved the stash into a
dedicated internal `item_variant_legacy_cost_archive` table that no route/model/resource
references). `LegacyInventoryFieldRemovalTest` grew from 5 to 7 cases (lossless `up()`/`down()`
round-trip + "archive not exposed by the variant API"). Still well under estimate — the review
rounds were the only real cost, and the underlying change never grew in scope.

Final gates: ~965 API tests + 236 webapp tests green; `migrate:fresh`/`rollback`/re-migrate
verified on seeded data; Pint/ESLint/tsc clean; full CI green (30/30, incl. all 6 Cypress E2E
shards from the newly-merged #490 gate) on the merge-ready commit.





