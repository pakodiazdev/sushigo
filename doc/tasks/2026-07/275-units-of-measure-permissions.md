# 🔐 Task #275: Define granular permissions for Units of Measure management

## 📖 Story

**English:**
As a developer, I need to add permission-based authorization to the `units-of-measure` (create/update/delete) and `uom-conversions` (create/delete) write endpoints, so that only users with a dedicated permission can manage them — matching the protection already applied to the rest of the Inventory module (`items.*`, `inventory_locations.*`, `stock.*`).

**Español:**
Como desarrollador, necesito agregar autorización basada en permisos a los endpoints de escritura de `units-of-measure` (crear/editar/eliminar) y `uom-conversions` (crear/eliminar), para que solo los usuarios con un permiso dedicado puedan gestionarlos — igualando la protección ya aplicada al resto del módulo de Inventario (`items.*`, `inventory_locations.*`, `stock.*`).

---

## 🔍 Root cause

`units-of-measure` and `uom-conversions` write endpoints are gated only by `auth:api` — any authenticated user can manage them. The `authorize()` methods on `CreateUnitOfMeasureRequest`, `UpdateUnitOfMeasureRequest`, and `CreateUomConversionRequest` were left as `return true` with a TODO during task #268 (SonarCloud `php:S1135` cleanup), since adding real enforcement required a product decision (permission name, which roles get it) out of scope for a mechanical TODO pass.

---

## ✅ Technical Tasks

- [x] 🔐 Add `units_of_measure.manage` permission definition to `Development/PermissionSeeder`, `Production/PermissionSeeder`, and `Testing/CoreTestSeeder`
- [x] 🔐 Assign it to `admin` and `inventory-manager` roles, matching the existing `inventory_locations.manage` pattern (read endpoints stay public)
- [x] 🔐 Add `permission:units_of_measure.manage` middleware to the write routes in `routes/api/units-of-measure.php` (create/update/delete for UOM, create/delete for conversions)
- [x] 🔐 Update `CreateUnitOfMeasureRequest::authorize()`, `UpdateUnitOfMeasureRequest::authorize()`, `CreateUomConversionRequest::authorize()` to call `$this->user()->can('units_of_measure.manage')`
- [x] 🧹 Remove the `// Granular permission tracked in #275` TODO comments once wired up
- [x] ✅ Feature tests: `admin`/`inventory-manager` can create/update/delete; unpermissioned user gets `403`; unauthenticated gets `401`
- [x] 🧪 Full PHPUnit suite green, Pint clean

---

## 🎯 Acceptance Criteria

- [x] All UOM/conversion write endpoints reject users lacking `units_of_measure.manage` with `403`
- [x] `admin` and `inventory-manager` roles retain full write access
- [x] No behavior change to the public read endpoints (`list`/`show`)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` (mechanical repeat of the `inventory_locations.manage` pattern)
- **Pessimistic:** `1.5h` (first Feature test file for this module — no existing UOM test coverage to extend)
- **Tracked:** `1h`

### 📅 Sessions
```json
[
  { "date": "2026-07-24", "start": "18:17", "end": "19:17" }
]
```

## 📊 Retrospective
- **Actual total:** 1h
- **vs optimistic:** +30m over
- **vs pessimistic:** on target

**Justification:**

Landed at the pessimistic estimate. The permission-wiring itself (seeders, route middleware, `authorize()` methods) was a mechanical repeat of the `inventory_locations.manage` pattern, as expected. The extra time went into `UnitOfMeasurePermissionsTest` — this is the first Feature test file for the Units of Measure module, so there was no existing suite to extend and every fixture (users, roles, UOM records, conversions) had to be built from scratch, mirroring `InventoryPermissionsTest`.

---

## 🔗 References

- GitHub issue: [#275](https://github.com/pakodiazdev/sushigo/issues/275)
- Parent: #268
- Reuses `inventory_locations.manage` pattern
