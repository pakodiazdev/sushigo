# 🗝️ Task #100: Inventory Permissions & Role Alignment

## 📖 Story

**English:**
As an Admin, I want the `inventory-manager` role to actually grant access to inventory operations (items, locations, stock), and to be able to assign it when creating an employee, so that the system permissions match real-world job responsibilities.

**Español:**
Como Admin, quiero que el rol `inventory-manager` otorgue acceso real a las operaciones de inventario (ítems, ubicaciones, stock), y poder asignarlo al crear un empleado, para que los permisos del sistema reflejen las responsabilidades reales del puesto.

---

## 🧠 Diagnóstico — estado anterior

| Problema | Descripción |
|---|---|
| Sin permisos de inventario | No existían `items.*`, `inventory_locations.*`, `stock.*` — ni en Dev ni en Prod PermissionSeeder |
| Rutas sin guard | `/items`, `/item-variants`, `/inventory`, `/stock`, `/inventory-locations` solo usaban `auth:api`, sin `permission:` middleware |
| Rol mal configurado | `inventory-manager` tenía `employees.*` + `users.*` — sin ningún permiso de inventario |
| Rol no asignable | `inventory-manager` no estaba en `Employee::POSITION_ROLES`, por lo que no podía asignarse al crear/editar un empleado en la UI |

---

## 🧠 Decisiones de diseño

- **`inventory-manager` como POSITION_ROLE**: Es un puesto de trabajo real, no solo un grupo de permisos técnico. Se agrega a `Employee::POSITION_ROLES`. Puede asignarse desde la UI de creación de empleados igual que `manager` o `cook`.
- **`inventory-manager` NO es admin**: Se le quitan los permisos de `users.*` y `employees.*` que heredó por error del seeder original. Solo debe gestionar inventario.
- **Granularidad de permisos** — sigue el patrón existente (`resource.action`):

  | Permiso | Descripción | Grupo |
  |---|---|---|
  | `items.view` | Ver ítems y variantes | Inventario |
  | `items.create` | Crear ítem / variante | Inventario |
  | `items.update` | Editar ítem / variante | Inventario |
  | `items.delete` | Eliminar ítem / variante | Inventario |
  | `inventory_locations.view` | Ver ubicaciones | Inventario |
  | `inventory_locations.manage` | Crear / editar / eliminar ubicaciones | Inventario |
  | `stock.view` | Ver stock y movimientos | Inventario |
  | `stock.manage` | Registrar saldo inicial y salidas | Inventario |

- **`admin` hereda inventario**: `admin` recibe todos los permisos de inventario además de los que ya tiene.
- **`super-admin` bypassa** todo: no cambia, ya recibe todos los permisos automáticamente.
- **Todas las rutas de inventario requieren auth**: tanto GETs como escrituras. SushiGo es una herramienta B2B interna — no hay catálogo público.

---

## ✅ Backend Tasks

### 1. Permisos — Development PermissionSeeder

- [x] 🔧 Agregar permisos de inventario al mapa de permisos:
  - `items.view`, `items.create`, `items.update`, `items.delete`
  - `inventory_locations.view`, `inventory_locations.manage`
  - `stock.view`, `stock.manage`
- [x] 🔧 Actualizar asignación de `inventory-manager`:
  - **Agregar**: todos los `items.*`, `inventory_locations.*`, `stock.*`
  - **Quitar**: `employees.*`, `users.*` (no corresponden al puesto)
- [x] 🔧 Actualizar asignación de `admin`:
  - **Agregar**: todos los permisos de inventario
- [x] 🔧 `super-admin`: sin cambio (ya sincroniza todos automáticamente)

### 2. Permisos — Production PermissionSeeder

- [x] 🔧 Mismos permisos de inventario en la lista plana de producción
- [x] 🔧 Misma lógica de asignación por rol (espeja cambios de Development)

### 3. Rutas — `routes/api.php`

- [x] 🔧 `/items` GET → `permission:items.view`
- [x] 🔧 `/items` POST → `permission:items.create`
- [x] 🔧 `/items/{id}` PUT → `permission:items.update`
- [x] 🔧 `/items/{id}` DELETE → `permission:items.delete`
- [x] 🔧 `/item-variants` GET → `permission:items.view`
- [x] 🔧 `/item-variants` POST → `permission:items.create`
- [x] 🔧 `/item-variants/{id}` PUT → `permission:items.update`
- [x] 🔧 `/item-variants/{id}` DELETE → `permission:items.delete`
- [x] 🔧 `/stock` GET (todas las variantes: list, by-location, by-variant) → `permission:stock.view`
- [x] 🔧 `/inventory/opening-balance` POST → `permission:stock.manage`
- [x] 🔧 `/inventory/stock-out` POST → `permission:stock.manage`
- [x] 🔧 `/inventory-locations` GET → `permission:inventory_locations.view`
- [x] 🔧 `/inventory-locations` POST/PUT/DELETE → `permission:inventory_locations.manage`

### 4. Modelo `Employee` — agregar `inventory-manager` a POSITION_ROLES

- [x] 🔧 Agregar constante `ROLE_INVENTORY_MANAGER = 'inventory-manager'` en `Employee`
- [x] 🔧 Agregar `self::ROLE_INVENTORY_MANAGER` al array `POSITION_ROLES`

### 5. Tests

- [x] ✅ PHPUnit Feature: `inventory-manager` puede listar ítems (`GET /items`) → 200
- [x] ✅ PHPUnit Feature: `inventory-manager` puede crear ítem (`POST /items`) → 201
- [x] ✅ PHPUnit Feature: `cook` no puede crear ítem (`POST /items`) → 403
- [x] ✅ PHPUnit Feature: `cook` no puede registrar stock-out → 403
- [x] ✅ PHPUnit Feature: admin puede gestionar inventario → 200/201
- [x] ✅ PHPUnit Feature: unauthenticated recibe 401 en rutas de inventario
- [x] ✅ PHPUnit Feature: Crear empleado con `role: inventory-manager` → user tiene el rol asignado
- [x] ✅ PHPUnit Unit: `Employee::POSITION_ROLES` contiene `inventory-manager` (8 roles en total)

---

## 🎯 Acceptance Criteria

- [x] `inventory@sushigo.com` (dev user) puede hacer CRUD de ítems, ubicaciones y registrar movimientos de stock
- [x] `cook`, `kitchen-assistant`, `delivery-driver` reciben 403 en rutas de inventario
- [x] Al crear un empleado con rol `inventory-manager`, ese rol aparece correctamente asignado
- [x] `admin` mantiene acceso completo a inventario (no regresión)
- [x] `super-admin` bypassa todo (sin cambio)

---

## 🔗 Referencias

- **Depende de:** nada (task independiente)
- **Desbloquea:** #099 (Permission-Aware Navigation) — el frontend puede usar `can('items.view')` para mostrar/ocultar la sección Inventario

---

## ⏱️ Estimado vs Real

- **Optimista:** `1.5h` · **Pesimista:** `2.5h`
- **Real:** ~3h (incluye fix de Spatie permission cache en TestCase base + refactor de StockOutTest a InventoryTestCase)

---

## ✅ Completado

- **PR:** #107 — merged `feature/100-inventory-permissions-role`
- **533 tests passing, 0 failures**
