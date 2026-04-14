# 🗝️ Task #100: Inventory Permissions & Role Alignment

## 📖 Story

**English:**
As an Admin, I want the `inventory-manager` role to actually grant access to inventory operations (items, locations, stock), and to be able to assign it when creating an employee, so that the system permissions match real-world job responsibilities.

**Español:**
Como Admin, quiero que el rol `inventory-manager` otorgue acceso real a las operaciones de inventario (ítems, ubicaciones, stock), y poder asignarlo al crear un empleado, para que los permisos del sistema reflejen las responsabilidades reales del puesto.

---

## 🧠 Diagnóstico — estado actual

| Problema | Descripción |
|---|---|
| Sin permisos de inventario | No existen `items.*`, `inventory_locations.*`, `stock.*` — ni en Dev ni en Prod PermissionSeeder |
| Rutas sin guard | `/items`, `/item-variants`, `/inventory`, `/stock`, `/inventory/locations` solo usan `auth:api`, sin `permission:` middleware |
| Rol mal configurado | `inventory-manager` tiene `employees.*` + `users.*` — sin ningún permiso de inventario |
| Rol no asignable | `inventory-manager` no está en `Employee::POSITION_ROLES`, por lo que no puede asignarse al crear/editar un empleado en la UI |

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

- **`admin` hereda inventario**: `admin` sigue recibiendo todos los permisos de inventario (además de los que ya tiene).
- **`super-admin` bypassa** todo: no cambia, ya recibe todos los permisos automáticamente.
- **Rutas de solo lectura (`GET`)** se protegen con `items.view` / `stock.view` / `inventory_locations.view`.
- **Rutas de escritura** se protegen con `items.create/update/delete` / `stock.manage` / `inventory_locations.manage`.

---

## ✅ Backend Tasks

### 1. Permisos — Development PermissionSeeder

- [ ] 🔧 Agregar permisos de inventario al mapa de permisos:
  - `items.view`, `items.create`, `items.update`, `items.delete`
  - `inventory_locations.view`, `inventory_locations.manage`
  - `stock.view`, `stock.manage`
- [ ] 🔧 Actualizar asignación de `inventory-manager`:
  - **Agregar**: todos los `items.*`, `inventory_locations.*`, `stock.*`
  - **Quitar**: `employees.*`, `users.*` (no corresponden al puesto)
- [ ] 🔧 Actualizar asignación de `admin`:
  - **Agregar**: todos los permisos de inventario (hereda lo que ya tiene + inventario)
- [ ] 🔧 `super-admin`: sin cambio (ya sincroniza todos automáticamente)

### 2. Permisos — Production PermissionSeeder

- [ ] 🔧 Mismos permisos de inventario en la lista plana de producción
- [ ] 🔧 Misma lógica de asignación por rol (espeja cambios de Development)

### 3. Rutas — `routes/api.php`

Agregar middleware `permission:` a las rutas de inventario que actualmente solo tienen `auth:api`:

- [ ] 🔧 `/items` GET → `permission:items.view`
- [ ] 🔧 `/items` POST → `permission:items.create`
- [ ] 🔧 `/items/{id}` PUT → `permission:items.update`
- [ ] 🔧 `/items/{id}` DELETE → `permission:items.delete`
- [ ] 🔧 `/item-variants` GET → `permission:items.view`
- [ ] 🔧 `/item-variants` POST → `permission:items.create`
- [ ] 🔧 `/item-variants/{id}` PUT → `permission:items.update`
- [ ] 🔧 `/item-variants/{id}` DELETE → `permission:items.delete`
- [ ] 🔧 `/stock` GET (todas las variantes: list, by-location, by-variant) → `permission:stock.view`
- [ ] 🔧 `/inventory/opening-balance` POST → `permission:stock.manage`
- [ ] 🔧 `/inventory/stock-out` POST → `permission:stock.manage`
- [ ] 🔧 `/inventory/locations` GET → `permission:inventory_locations.view`
- [ ] 🔧 `/inventory/locations` POST/PUT/DELETE → `permission:inventory_locations.manage`

> **Nota**: Las rutas de ítems y stock actualmente son parcialmente públicas (GET sin auth). Se mantiene `auth:api` como base y se agrega el guard de permiso encima solo en los grupos autenticados.

### 4. Modelo `Employee` — agregar `inventory-manager` a POSITION_ROLES

- [ ] 🔧 Agregar constante `ROLE_INVENTORY_MANAGER = 'inventory-manager'` en `Employee`
- [ ] 🔧 Agregar `self::ROLE_INVENTORY_MANAGER` al array `POSITION_ROLES`
- [ ] 🔧 **No** es `PRIVILEGED_ROLE` — cualquier admin puede asignarlo

### 5. Tests

- [ ] ✅ PHPUnit Feature: `inventory-manager` puede listar ítems (`GET /items`) → 200
- [ ] ✅ PHPUnit Feature: `inventory-manager` puede crear ítem (`POST /items`) → 201
- [ ] ✅ PHPUnit Feature: `cook` no puede crear ítem (`POST /items`) → 403
- [ ] ✅ PHPUnit Feature: `cook` no puede registrar stock-out → 403
- [ ] ✅ PHPUnit Feature: admin puede gestionar inventario → 200/201
- [ ] ✅ PHPUnit Unit: `Employee::getAssignableRolesFor()` incluye `inventory-manager` para admins
- [ ] ✅ PHPUnit Feature: Crear empleado con `role: inventory-manager` → user tiene el rol asignado

---

## 🎯 Acceptance Criteria

- [ ] `inventory@sushigo.com` (dev user) puede hacer CRUD de ítems, ubicaciones y registrar movimientos de stock
- [ ] `cook`, `kitchen-assistant`, `delivery-driver` reciben 403 en rutas de escritura de inventario
- [ ] Al crear un empleado con rol `inventory-manager`, ese rol aparece correctamente asignado
- [ ] `admin` mantiene acceso completo a inventario (no regresión)
- [ ] `super-admin` bypassa todo (sin cambio)

---

## 🔗 Referencias

- **Depende de:** nada (task independiente)
- **Desbloquea:** #099 (Permission-Aware Navigation) — el frontend podrá usar `can('items.view')` para mostrar/ocultar la sección Inventario

---

## ⏱️ Estimado

- **Optimista:** `1.5h` · **Pesimista:** `2.5h`
