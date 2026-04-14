# 🔐 Task #099: Permission-Aware Navigation & Route Guards

## 📖 Story

**English:**
As a system, I want the sidebar and routes to adapt to the logged-in user's roles and permissions, so that restricted sections are either hidden or visually disabled depending on whether they are discoverable, and direct URL access is blocked with a proper 403 response.

**Español:**
Como sistema, quiero que el sidebar y las rutas se adapten a los roles y permisos del usuario autenticado, de modo que las secciones restringidas se oculten o deshabiliten visualmente según si son descubribles, y que el acceso directo por URL sea bloqueado con una respuesta 403 adecuada.

---

## 🧠 Key Design Decisions

- **`hidden` vs `disabled`**: Each menu item declares its access mode.
  - `hidden` (default) — item is completely omitted from the DOM. User never knows it exists. Use for admin-only sections.
  - `disabled` — item renders greyed-out and unclickable. User sees it but cannot navigate. Use for sections they may eventually get access to (e.g., Reports for a manager in training).
- **Auth store already has the primitives**: `can(permission)`, `isAdmin`, `isSuperAdmin`. No new backend calls needed — permissions are loaded at login via `GET /api/v1/me`.
- **`admin` and `super-admin` roles bypass all permission checks** (already implemented in `checkPermission()`).
- **Route guards via TanStack Router `beforeLoad`**: catches direct URL access. Redirects to `/unauthorized`.
- **`<CanAccess>` component**: inline guard for page-level UI elements (buttons, tabs, panels) that should be hidden based on permissions.
- **`useCanAccess` hook**: composable version of `<CanAccess>` for imperative checks inside hooks/handlers.

---

## ✅ Tasks

### 1. Permission config on menu items

Update `MenuItem` interface in `Sidebar.tsx`:

```ts
interface MenuItem {
  icon: LucideIcon
  label: string
  path?: string
  subItems?: SubMenuItem[]
  // Access control
  requiredPermission?: string      // e.g. 'employees.view'
  requiredRole?: 'admin' | 'super-admin'
  accessMode?: 'hidden' | 'disabled'  // default: 'hidden'
}
```

**Permission mapping for current menu items:**

| Section         | Guard                       | Mode       |
|-----------------|-----------------------------|------------|
| Dashboard       | —                           | always     |
| Productos       | —                           | always     |
| Órdenes         | —                           | always     |
| Clientes        | —                           | always     |
| Empleados       | `employees.view`            | `hidden`   |
| Asistencia      | `employees.view`            | `hidden`   |
| Inventario      | `items.view`                | `hidden`   |
| Caja            | `cash_registers.view`       | `hidden`   |
| Stock Dashboard | `stock.view`                | `hidden`   |
| Configuración   | `requiredRole: 'super-admin'` | `hidden` |

### 2. `useMenuAccess` hook

- [ ] 🔧 Create `src/hooks/use-menu-access.ts`
- Reads `can()`, `isAdmin`, `isSuperAdmin` from auth store
- Returns `resolveAccess(item: MenuItem): 'show' | 'disabled' | 'hidden'`
- Used inside `Sidebar` to filter/style items

### 3. Update `Sidebar`

- [ ] 📱 For `hidden` items: exclude from render entirely
- [ ] 📱 For `disabled` items: render with `opacity-50 pointer-events-none cursor-not-allowed`, no `Link`/`button` behavior, add `title="Sin acceso"` tooltip
- [ ] 📱 Sub-items inherit parent's access — if parent is hidden, all sub-items hidden too
- [ ] 📱 If all sub-items of a group are hidden, hide the group header too

### 4. `<CanAccess>` component

- [ ] 🔧 Create `src/components/auth/CanAccess.tsx`

```tsx
interface CanAccessProps {
  permission?: string
  role?: 'admin' | 'super-admin'
  mode?: 'hidden' | 'disabled'   // default: 'hidden'
  children: React.ReactNode
  fallback?: React.ReactNode      // rendered when no access (for 'hidden' mode)
}
```

Usage examples:
```tsx
// Hide completely
<CanAccess permission="employees.create">
  <Button>Agregar empleado</Button>
</CanAccess>

// Show disabled with fallback tooltip
<CanAccess permission="leaves.approve" mode="disabled">
  <Button>Aprobar permiso</Button>
</CanAccess>

// Role check
<CanAccess role="super-admin">
  <AdminPanel />
</CanAccess>
```

### 5. `useCanAccess` hook

- [ ] 🔧 Create `src/hooks/use-can-access.ts`

```ts
function useCanAccess(opts: { permission?: string; role?: 'admin' | 'super-admin' }): boolean
```

Used imperatively in hooks/handlers:
```ts
const canApprove = useCanAccess({ permission: 'leaves.approve' })
if (!canApprove) return
```

### 6. TanStack Router route guards

- [ ] 🔧 Create `src/lib/route-guards.ts` — helpers:

```ts
// Usage in route definition:
export const Route = createFileRoute('/employees')({
  beforeLoad: requirePermission('employees.view'),
})

export const Route = createFileRoute('/configuracion')({
  beforeLoad: requireRole('super-admin'),
})
```

- [ ] 🔧 `requirePermission(permission)` — factory returning a `beforeLoad` function that:
  - Reads `useAuthStore.getState()` (non-reactive, safe in beforeLoad)
  - If no access → `throw redirect({ to: '/unauthorized' })`
- [ ] 🔧 `requireRole(role)` — same but checks role
- [ ] 📱 Apply guards to existing routes:
  - `/employees` → `requirePermission('employees.view')`
  - `/attendance/*` → `requirePermission('employees.view')`
  - `/inventory/*` → `requirePermission('items.view')` (covers admin + inventory-manager)
  - `/cash/*` → `requirePermission('cash_registers.view')`
  - `/configuracion` → `requireRole('super-admin')`

### 7. `/unauthorized` page

- [ ] 📂 Create `src/pages/unauthorized.tsx`
- Simple 403 page: lock icon, "Sin acceso", "No tienes permiso para ver esta página", back-to-dashboard button
- No auth guard on this route (anyone can see it)

### 8. Export from `@/components/auth`

- [ ] 🔧 Update `src/components/auth/index.ts` to export `CanAccess`

---

## 🧪 Tests

- [ ] ✅ Vitest `useMenuAccess`:
  - admin user sees all items
  - manager user sees Empleados + Asistencia, hidden Inventario/Configuración/Stock
  - inventory-manager sees Inventario, hidden Empleados/Caja/Configuración
  - unknown role sees only Dashboard/Productos/Órdenes/Clientes
- [ ] ✅ Vitest `<CanAccess>`:
  - renders children when permission matches
  - renders nothing (`hidden` mode) when no permission
  - renders disabled wrapper when `mode="disabled"`
  - renders `fallback` when provided and no access
- [ ] ✅ Vitest `requirePermission` guard:
  - redirects to `/unauthorized` when permission missing
  - passes through when admin (bypass)
- [ ] 🌲 Cypress E2E (happy path):
  - Login as `manager` → Inventario section not visible in sidebar
  - Login as `admin` → all sections visible
  - Direct URL `/configuracion` as manager → lands on `/unauthorized`

---

## 🎯 Acceptance Criteria

- [ ] Sidebar items are automatically shown/hidden based on the logged-in user's permissions
- [ ] Disabled items render greyed-out and unclickable
- [ ] Direct URL access to protected routes redirects to `/unauthorized`
- [ ] `<CanAccess>` works for inline UI elements (buttons, panels)
- [ ] `admin` and `super-admin` always bypass all guards
- [ ] No flash of unauthorized content (guards use `getState()` synchronously)

---

## 🔗 References

- **Auth store:** `src/stores/auth.store.ts` — already has `can()`, `isAdmin`, `isSuperAdmin`
- **Sidebar:** `src/components/layout/Sidebar.tsx`
- **Route guards:** TanStack Router `beforeLoad` API

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
