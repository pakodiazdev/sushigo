# 🔑 Task #097: Direct Permission Manager for Employees

## 📖 Story

**English:**
As an admin, I want to view and grant individual permissions to a user — on top of those already provided by their roles — so I can fine-tune access for edge cases without creating a new role.

**Español:**
Como administrador, quiero ver y otorgar permisos individuales a un usuario — además de los que ya tiene por sus roles — para ajustar el acceso en casos especiales sin tener que crear un nuevo rol.

---

## 🧠 Key Design Decisions

### Permission model
Effective permissions = union of all role permissions + direct grants. There is no "deny override":
- **`role`** — granted by an assigned role. To remove it, remove the role.
- **`direct`** — explicitly granted on top of roles via `givePermissionTo()`.
- **`none`** — not granted by any source.

This matches the standard industry pattern (AWS IAM, GitHub, Okta): direct permissions are **additions only**. Removing a direct grant reverts to `role` or `none`; it never suppresses a role grant.

### Permission labels
A `label` column (string, nullable) is added to the `permissions` table via migration. The existing `PermissionSeeder` is updated to fill it when creating each permission. The `GET` endpoint reads it directly from the model — no config lookup needed.

### Entry point
Below the Roles grid in the employee slide panel, a **"Gestionar →"** button opens a `<dialog>`. The button is hidden when the employee has no linked `User` account or when the logged-in user lacks `users.show` + `users.update`.

### UI states per permission row
| State | Checkbox | Editable? | Visual |
|---|---|---|---|
| `role` | ✅ checked | No | Greyed out + badge "vía Rol: X" |
| `direct` | ✅ checked | Yes | Blue outline |
| `none` | ⬜ unchecked | Yes | Normal |

---

## ✅ Backend Tasks

- [x] 📂 Migration `add_label_to_permissions_table` — adds nullable `label` string column to the `permissions` table (Spatie-managed)
- [x] 📂 Migration `add_group_to_permissions_table` — adds nullable `group` string column
- [x] 🌱 Update `PermissionSeeder` — populate `label` and `group` for every existing permission slug
- [x] 🌐 `GET /api/v1/employees/{employee}/permissions` — `GetUserPermissionsController`
  - Returns all system permissions grouped by module
  - Each permission: `name` (slug), `label`, `group`, `source` (`role|direct|none`), `via_roles: string[]`
  - Requires `users.show` permission
  - Validated via `GetUserPermissionsRequest` (aborts 404 if no user linked)
- [x] 🌐 `PUT /api/v1/employees/{employee}/permissions` — `SyncUserDirectPermissionsController`
  - Body: `{ "grant": ["perm.a"], "revoke": ["perm.b"] }`
  - `grant` → `givePermissionTo()` for each slug
  - `revoke` → `revokePermissionTo()` for each slug (removes direct grant only; role grants unaffected)
  - Validates all slugs exist; returns 422 on unknown permission
  - Requires `users.update` permission
  - Returns updated permission list (same shape as GET)
  - Validated via `SyncUserPermissionsRequest` (authorize aborts 404 if no user linked, exposes `getValidatedUser()`)
- [x] 🔧 `UserPermissionsResource` — formats the combined permission state using `getAllPermissions()`, `getDirectPermissions()`, and `getPermissionsViaRoles()`
- [x] 🧪 Feature tests (14 tests, 59 assertions):
  - GET: `source` is `role` for role-inherited, `direct` for directly granted, `none` for unset
  - GET: `via_roles` lists correct role names when `source = role`
  - PUT grant: slug appears as `direct` in subsequent GET
  - PUT revoke: direct grant removed; if role still grants it, `source` reverts to `role`
  - PUT revoke on a `role`-only permission: no-op (role grant not removed)
  - Unknown slug in grant/revoke → 422
  - Unauthorized: 401/403

---

## ✅ Frontend Tasks

- [x] 🔧 `src/services/user-permissions-api.ts` — `getPermissions(employeeId)` + `syncPermissions(employeeId, { grant, revoke })`
- [x] 📝 Types in `src/types/user-permissions.ts`: `PermissionSource`, `UserPermission`, `PermissionGroup`, `SyncPermissionsPayload`
- [x] 🔧 `usePermissionManager(employeeId)` hook — fetches permission list, owns sync mutation, tracks local checkbox changes (dirty state), computes delta `{ grant, revoke }` on save
- [x] 📱 **`PermissionManagerDialog`** (`src/components/employees/permission-manager-dialog.tsx`)
  - Opened by "Gestionar →" button in `employee-detail-view.tsx`, below employment history
  - Only rendered when `employee.has_user && canManagePermissions`
  - Header: "Permisos directos — {employee name}" + subtitle
  - Permissions grouped by module in `<Accordion>` sections (collapsed by default, resets on reopen)
  - Each row: `checkbox` + `label` + optional `via_roles` badge
  - `role` rows: checkbox disabled (checked, grey)
  - `direct` rows: checkbox enabled
  - `none` rows: checkbox enabled, unchecked
  - Footer: "Guardar cambios" (disabled if no changes) + "Cancelar"
  - Escape-to-close uses capture phase + `stopImmediatePropagation` (prevents closing parent SlidePanel)
  - Native `<dialog open>` element for a11y
  - On save: call sync → toast "Permisos actualizados" → close
  - On cancel / close without save: discard local changes

---

## 🧪 Tests

- [x] ✅ PHPUnit: all backend feature tests (14 tests, 59 assertions) — `UserPermissionsTest`
- [x] ✅ Vitest: `usePermissionManager` (17 tests) — toggle none→grant, direct→revoke, role no-op, double-toggle reverts, save sends correct delta
- [x] ✅ Vitest: `PermissionManagerDialog` (25 tests) — visibility, accordion, checkboxes, save/cancel, backdrop, Escape, reset on reopen
- [x] 🌲 Cypress E2E (`direct-permission-manager.cy.ts`):
  - Grant: admin grants `employees.view` to a cook → API verify she can now list employees (200)
  - Revoke: admin revokes `employees.view` → API verify she gets 403 again

---

## 🎯 Acceptance Criteria

- [x] Permissions inherited via role are shown checked and disabled; no edits possible from this dialog
- [x] Admin can grant a permission not currently provided by any role
- [x] Admin can remove a previously direct-granted permission (reverts to `role` or `none`)
- [x] Save button disabled if no checkbox has changed
- [x] Closing without saving discards all local changes
- [x] Link hidden when employee has no linked user account
- [x] Unknown or invalid slugs return 422 from the API

---

## 🔗 References

- **Depends on:** existing Spatie Permission setup, employee–user link (#086)
- **PR:** #101

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `6h` · **Tracked:** —

### 📅 Sessions
```json
[
  { "date": "2026-04-11", "duration": "~6h", "note": "Full implementation + PR review iterations" }
]
```
