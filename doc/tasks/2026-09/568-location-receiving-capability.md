# 🏭 Define purchase-receiving capabilities for Inventory Locations

**Labels:** enhancement, backend, frontend, investment: product, sprint-7

# 🏭 Define purchase-receiving capabilities for Inventory Locations

## Description

Make an Inventory Location's ability to receive supplier purchases an explicit domain capability instead of inferring it from the broad `type` enum. Add `can_receive_purchases` to the persisted Location contract, backfill today's primary `MAIN` locations conservatively, expose the capability through the API, and make it manageable in the existing Location UI.

This issue deliberately keeps the existing hierarchy intact: `OperatingUnit` remains the operational/facility boundary and `InventoryLocation` remains the physical or logical custody point. It does not introduce a `Warehouse` table.

## Reason

Purchase Receipts currently accept any non-deleted `InventoryLocation` as their destination. That allows semantically invalid destinations such as `WASTE`, `RETURN`, `BAR`, or an inactive Location. A dedicated capability scales better than a hardcoded `type === MAIN` check: a primary Location may be storage-only, while a dedicated receiving dock may receive purchases without being the primary storage Location.

## Objective

Provide one authoritative, queryable Location capability that downstream Receipt, Opening Balance, and Transfer workflows can use to determine whether supplier inventory may enter a Location.

## Domain decisions

- `OperatingUnit` remains the access and operational scope established by #440.
- `InventoryLocation` remains the Stock custody key; Stock is not stored at `OperatingUnit` level.
- `can_receive_purchases` is independent from `is_primary`, `is_active`, and `is_pickable`.
- Existing active, primary `MAIN` Locations are backfilled to `true`; every other existing Location is `false` unless explicitly changed later.
- The migration must be reversible and must not rewrite historical Receipts or Stock.
- No `Warehouse` model/table is introduced in Sprint 7. That boundary is deferred until the product requires multiple administratively independent warehouses inside one Operating Unit.

## ✅ Technical Tasks

### API and persistence

- [x] 🗃️ Add a migration for `inventory_locations.can_receive_purchases` with a safe default, deterministic backfill, useful index, and reversible `down()`.
- [x] 🧩 Add the field to `InventoryLocation::$fillable`, casts, factories, and response formatting.
- [x] 🛡️ Add create/update validation for a boolean capability without changing existing `type` semantics.
- [x] 🔎 Add `can_receive_purchases` as an optional filter to `GET /api/v1/inventory-locations`; the filter must remain constrained by `OperatingUnitScope` before it is applied.
- [x] 📖 Update OpenAPI annotations and bilingual Inventory architecture documentation touched by the contract.

### Webapp

- [x] 🛠️ Extend Inventory Location types/services/forms/details with the capability.
- [x] 🎨 Label the field in operational language (for example, "Puede recibir compras") and explain that it controls Receipt destinations.
- [x] ♿ Preserve keyboard, label, error, loading, and mutation-feedback behavior used by the existing Location UI.

### Tests

- [x] 🧪 Feature-test create, update, list serialization, true/false filtering, defaults, and Operating Unit scoping.
- [x] 🧪 Verify migration backfill: only active + primary + `MAIN` rows become receiving-capable.
- [x] 🧪 Add frontend tests for reading and changing the capability.
- [x] 🧹 Run the Inventory API regression suite, Pint, frontend tests, ESLint, and TypeScript.

## 🎯 Acceptance Criteria

- [x] Every Inventory Location has an explicit persisted `can_receive_purchases` value.
- [x] Existing active primary `MAIN` Locations retain the ability to receive purchases after migration.
- [x] New Locations default to not receiving purchases unless the caller explicitly opts in.
- [x] Authorized users can manage the capability in the existing Location workflow.
- [x] Consumers can request only receiving-capable Locations through the list API without escaping Operating Unit scope.
- [x] No Receipt, Stock, or Stock Movement behavior changes in this issue.
- [x] No `Warehouse` table or duplicate inventory hierarchy is introduced.

## Parallelization and ownership

- **Sprint 7 lane:** Foundation A.
- **Can run in parallel with:** the centralized entry-posting issue and the Variant-to-Location assignment issue.
- **Primary ownership:** Inventory Location migration/model/request/controllers/resources and Location frontend.
- **Avoid touching:** `ReceiptService`, Receipt requests/components, `OpeningBalanceService`, and transfer services so dependent lanes can proceed without merge conflicts.

## Out of scope

- Receipt destination enforcement and Receipt UI filtering.
- Opening Balance UI.
- Internal Stock transfers.
- Variant-to-Location assortment assignment.
- Hierarchical bins or a dedicated `Warehouse` entity.

## 🔗 References

- #440 — Operating Unit scope and horizontal Inventory authorization.
- `doc/architecture/inventory-architecture.en.md`
- `doc/architecture/inventory-architecture.es.md`
- `app/Models/InventoryLocation.php`
- `app/Http/Requests/InventoryLocation/Concerns/SharesInventoryLocationRules.php`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `9h` · **Tracked:** `2h13m`

### 📅 Sessions
```json
[
  { "date": "2026-09-03", "start": "02:03", "end": "03:26" },
  { "date": "2026-09-03", "start": "09:50", "end": "10:20" },
  { "date": "2026-09-03", "start": "15:10", "end": "15:30" }
]
```





## 📊 Retrospective
- **Actual total:** 2h13m (83m + 30m + 20m)
- **vs optimistic:** −2h47m (under)
- **vs pessimistic:** −6h47m (under)

**Justification:**
Finished well under the optimistic estimate. The work was a purely additive single-column change
with strong existing patterns to follow: the migration mirrored `add_is_active_to_inventory_locations`
plus the `DeleteLegacyProductoItemsMigrationTest` re-runnable-`up()` idiom for the backfill test, and
the Location request/controller surface already exposed the `SharesInventoryLocationRules` seam and a
`FormatsInventoryLocation` concern to extend. The webapp change was one checkbox on the existing
`Checkbox`/`FormField`/`useFormMutation` form plus one detail-panel row. The 5–9h estimate looks
padded for a broader "warehouse receiving" reading; the issue's deliberately tight scope (no Receipt
enforcement, no `Warehouse` table — both deferred to #572) kept it contained.

Two unplanned cycles, ~50m combined: (1) the first Cypress spec drove the operating-unit `<select>`
in the create form and timed out on CI shard 6/6 — rewrote it to seed the target Location via the API
against the `test:reset` Operating Unit and exercise the detail-read + edit-toggle flow instead;
(2) Codex review flagged that `['nullable', 'boolean']` on the new rule let `can_receive_purchases: null`
pass validation and hit the NOT NULL column as a 500 — dropped `nullable` (rule is now `['boolean']`)
and added null-rejection feature tests for create and update.

