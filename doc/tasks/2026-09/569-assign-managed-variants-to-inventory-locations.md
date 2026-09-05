# 📍 Assign managed Variants to Inventory Locations

**Labels:** feature, backend, frontend, investment: product, sprint-7

# 📍 Assign managed Variants to Inventory Locations

## Description

Add an explicit `VariantLocationAssignment` (or equivalently named) domain record that states a Variant is actively managed at an Inventory Location, independently from its current physical quantity and independently from optional replenishment thresholds.

Backfill assignments from existing Stock rows and live `VariantLocationReplenishmentPolicy` rows. Provide scoped API operations needed to assign/unassign Variants without creating artificial zero-quantity Stock rows.

## Reason

Today the Stock dashboard starts from `stock`, so a Variant that is expected at a Location but has never been received, or has reached zero without a retained row in a future cleanup, cannot be represented reliably. Reusing replenishment policies as assortment assignment would incorrectly make min/max configuration mandatory. Pre-creating `stock` for every possible pair would conflate catalog intent with physical balance and grow a large sparse projection.

## Objective

Represent the managed assortment per Location as its own source of truth so zero Stock is visible and future receiving, replenishment, and transfer workflows can validate whether a Variant belongs at a destination.

## Domain decisions

- `VariantLocationAssignment` means "this Variant is managed here"; it never carries physical quantity or acquisition cost.
- `Stock` remains lazily created by the first posted movement and remains the only physical balance projection.
- `VariantLocationReplenishmentPolicy` remains optional configuration; it is not renamed or overloaded into assignment.
- One live assignment exists per `(inventory_location_id, item_variant_id)`; soft deletion allows historical reactivation without losing audit context.
- Unassigning is forbidden while on-hand or reserved Stock is non-zero. The issue must define a deterministic conflict response.
- Every endpoint uses public IDs externally and `OperatingUnitScope` for horizontal access.

## ✅ Technical Tasks

### Persistence and model

- [x] 🗃️ Create `variant_location_assignments` with public ULID, Location/Variant FKs, active state or soft delete, timestamps, and one-live-pair uniqueness.
- [x] 🔄 Backfill the distinct union of current `stock` pairs and live replenishment-policy pairs, idempotently and reversibly.
- [x] 🧩 Add model relationships from `InventoryLocation` and `ItemVariant`.
- [x] 🛡️ Prevent unassignment when `on_hand > 0` or `reserved > 0`; return a stable `409` business conflict.

### API

- [x] 🔌 Add scoped list/assign/unassign endpoints below the Inventory Location resource using SAC controllers, FormRequests, and JsonResources.
- [x] 🔐 Require `stock.view` for reads and `stock.manage` for writes, plus active Operating Unit membership or the established bypass role.
- [x] 🔎 Support search/pagination suitable for a Variant picker without returning Variants from outside the relevant catalog rules.
- [x] 📖 Document public-ID, conflict, and empty-state response contracts in OpenAPI.

### Management UI

- [x] 🖥️ Add a focused Variant-assignment panel to the Inventory Location workflow, separate from replenishment thresholds.
- [x] 🔍 Provide search, assigned/unassigned state, loading, empty, error, mutation feedback, and accessible controls.
- [x] 🚫 Surface why an assignment with non-zero Stock cannot be removed.

### Tests

- [x] 🧪 Cover uniqueness, backfill, scoped CRUD, public IDs, soft-delete/reactivation, and non-zero Stock conflict.
- [x] 🧪 Prove assigning a Variant does not create a `stock` row or movement.
- [x] 🧪 Prove policies and assignments remain independent.
- [x] 🧪 Add frontend service/component tests and run Inventory regression, Pint, ESLint, TypeScript, and relevant Vitest suites.

## 🎯 Acceptance Criteria

- [x] A Location can explicitly manage a Variant without having received quantity.
- [x] Existing Stock and replenishment-policy pairs gain assignments with no data loss.
- [x] Assignment creation never changes Stock or writes a Stock Movement.
- [x] A non-zero or reserved balance blocks unassignment with `409`.
- [x] Assignment endpoints and UI are constrained to the caller's accessible Operating Units.
- [x] Replenishment thresholds remain optional and separately manageable.

## Parallelization and ownership

- **Sprint 7 lane:** Foundation C.
- **Can run in parallel with:** receiving-capable Locations and centralized entry posting.
- **Primary ownership:** new assignment migration/model/controllers/resources and the Location assignment panel.
- **Avoid touching:** Stock list/dashboard queries in this issue; the assignment-aware projection issue owns those files after this contract merges.

## Out of scope

- Automatically rejecting every Receipt or Transfer for an unassigned Variant; adoption is handled by the consuming workflow issues.
- Changing physical Stock balances.
- Replenishment forecasting or automatic purchase orders.
- A `Warehouse` table or hierarchical bins.

## 🔗 References

- #439 — per-Location replenishment policies.
- #440 — Operating Unit Inventory scope.
- `app/Models/VariantLocationReplenishmentPolicy.php`
- `app/Http/Controllers/Api/V1/Stock/ListStockController.php`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `8h` · **Pessimistic:** `14h` · **Tracked:** `44m`

### 📅 Sessions
```json
[
  { "date": "2026-09-03", "start": "02:04", "end": "02:48" }
]
```

## 📊 Retrospective
- **Actual total:** 44m (44m — single recorded session)
- **vs optimistic:** −7h 16m
- **vs pessimistic:** −13h 16m

**Justification:**
The `44m` figure is the one work session recorded on this issue (2026-09-03 02:04–02:48), which
covers the autonomous first pass only: TDD of the migration + `VariantLocationAssignmentBackfill`,
the model and relationships, the three SAC endpoints (list/assign/unassign) with FormRequests and a
JsonResource, the `VariantAssignmentsPanel` with its hook/api, backend Feature + frontend
Vitest/Cypress tests, the `§3.13` architecture-doc entries, and CI to green. It landed under even
the optimistic estimate because the #439 replenishment-policy feature was a near-exact structural
template — same route shape, permissions, `OperatingUnitScope` wiring, resource envelope, and test
base class — so most of the work was adaptation rather than design.

Three further commits followed, driven through `/pr-comments` and `/sonar-review` rather than a
tracked issue session, so their time is not reflected above:
- `d75052e8` — Codex review: partial-unique-index race recovery on assign (savepoint + reload),
  reject inactive Variants with 422, wrap the unassign 409 guard in a transaction with a locked
  read, and page the panel list with `useInfiniteQuery` + a "Load more" control.
- `c056c28e` — two more concurrency findings: lock the pair's Stock row by (location, variant)
  only so a zeroed row is locked too, and make the backfill skip any pair with a live *or*
  soft-deleted assignment so a rerun never resurrects a deliberate unassignment.
- `2506d6de` — SonarCloud new-code smells: split `assignOrRecover` to keep every method at ≤3
  returns (`php:S1142`), and replace a nested ternary with an if/else-if chain (`typescript:S3358`).

Re-derived, the whole delivery including those review and quality cycles would still have sat
toward the optimistic end of the `8h–14h` band; the large negative variance above is an artifact
of the Sessions log capturing only the first stretch, not a true 44-minute feature.

