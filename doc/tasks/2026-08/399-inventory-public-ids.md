# 🔨 Expose public_id (ULID) for Item/ItemVariant and the rest of the Inventory domain

**Labels:** sprint-5, investment: product-engineering

## Description

`Item` and `ItemVariant` (and the rest of the Inventory domain — `Stock`, `StockMovement`, `StockMovementLine`, `InventoryLocation`, `UnitOfMeasure`) expose their raw sequential integer `id` in routes and JSON responses instead of a ULID `public_id`, unlike the 20+ models already migrated to the `HasPublicId` convention (HR/Attendance/Payroll domain, and `MediaGallery`/`MediaAsset` as of #377).

As of #422/#424, the concrete affected routes are `GET|PUT|DELETE /inventory/products/{id}` (Product = `Item` where `type=PRODUCTO`) and `GET|PUT|DELETE /inventory/products/{id}/variants/{variantId}` (`ItemVariant`), both defined in `routes/api/product-catalog.php` via `RouteParams::ID` / `RouteParams::VARIANT_ID` (`app/Support/RouteParams.php`). #422 shipped `Brand` and `InventoryCategory` in the same file *already* on `public_id` (implicit binding on `{brand}` / `{inventoryCategory}`, both models using `HasPublicId`) — so within Product Catalog, `Item`/`ItemVariant` are now the only two holdouts, not the whole domain equally. `doc/architecture/inventory-architecture.en.md` §5 and `doc/architecture/product-catalog/product-catalog-architecture.en.md` both document this as a deferred-to-#399 assumption.

## Reason

Raised during review of #377 (media upload system): `UpdateItemRequest`/`CreateItemRequest` now validate `media_gallery_id` as a `public_id` string, which highlighted that `Item` itself is still addressed by `$this->route('id')` as a raw integer. Sequential integer IDs are trivially enumerable — the same class of finding already fixed for CashAdjustments' 6 resource types in #291/#293. Fixing it there was scoped narrowly to those 6 models; the Inventory domain was never covered and is a separate, larger surface (more models, more routes, webapp consumers of `code/webapp/src/services/item-api.ts` and friends).

Reconfirmed during #424 (PR #470): reviewer flagged the same numeric-`id`-in-routes gap on the new `/inventory/products/{id}/variants/{variantId}` endpoints. Decision was to keep #424 scoped to variant identity (SKU/barcode/UOM) and not fold this refactor in — deliberately deferred here, not dropped.

## Objective

- [x] Add `public_id` (ULID) column + `HasPublicId` trait to `Item`, `ItemVariant`, `Stock`, `StockMovement`, `StockMovementLine`, `InventoryLocation`, `UnitOfMeasure` — migration backfilling existing rows
- [ ] Switch `/inventory/products/{id}` and `/inventory/products/{id}/variants/{variantId}` (`RouteParams::ID` / `RouteParams::VARIANT_ID` in `app/Support/RouteParams.php`, and other Inventory routes using them) to typed Eloquent implicit binding on `public_id` — mirror how `Brand`/`InventoryCategory` already bind on `{brand}` / `{inventoryCategory}` in `routes/api/product-catalog.php`
- [x] Apply `SerializesPublicIdAsId` (or equivalent) so `public_id` is what serializes as `id` in every response — Show/Update/List/nested relations
- [x] Update `ResolvesPublicIdReferences`/`ResolvesPublicIdFilters` usage anywhere these models are referenced by FK from other requests (e.g. `media_gallery_id` attach flow from #377 already expects `Item`'s own identifier to eventually follow this convention)
- [x] Webapp: `id: number` → `id: string` for these resources in `code/webapp/src/services/`
- [x] No behavior change beyond id representation — same authorization, same validation

## Acceptance Criteria

- [x] All Inventory-domain resources listed above expose `public_id` (ULID) as `id` in every API response
- [x] Numeric primary key remains internal-only (FKs, queries) — never serialized
- [x] Existing Feature tests updated to assert against `public_id` in URLs and JSON
- [x] Full PHPUnit + Vitest suites green

## References

- Raised in review of #377: https://github.com/pakodiazdev/sushigo/pull/392#discussion_r3715281948
- Reconfirmed in review of #424: PR #470 (branch `feature/424-redesign-product-variants`)
- Precedent: #291 (authorization), #293 (`public_id` rollout for CashAdjustments' 6 models) — `doc/tasks/2026-07/293-cashadjustments-public-id.md`
- In-domain precedent already shipped: `Brand`/`InventoryCategory` (#422) — `app/Models/Brand.php`, `app/Models/InventoryCategory.php`
- Existing convention: `App\Support\Traits\HasPublicId`, `App\Support\Traits\SerializesPublicIdAsId`
- Current numeric-id routes to migrate: `routes/api/product-catalog.php` (Products/Variants groups), `app/Support/RouteParams.php` (`ID`, `VARIANT_ID`)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h`
- **Pessimistic:** `6h`
- **Tracked:** `0h 0m`

### 📅 Sessions
```json
[]
```

## 📊 Retrospective
- **Actual total:** 0h 0m (0m)
- **vs optimistic:** −3h 0m
- **vs pessimistic:** −6h 0m

**Justification:**
The Sessions array remained empty, so the convention-mandated tracked total is 0m and cannot represent the actual implementation effort. The work included CI repair, review-feedback changes, and two SonarCloud remediation cycles, but none of those activities were captured as start/end sessions; future executions should start time tracking before implementation so the retrospective reflects real effort.


