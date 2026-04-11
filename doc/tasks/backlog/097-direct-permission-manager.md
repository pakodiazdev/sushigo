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
Below the Roles grid in the employee slide panel, a **"Gestionar permisos directos →"** link opens a `<Dialog>`. The link is hidden when the employee has no linked `User` account.

### UI states per permission row
| State | Checkbox | Editable? | Visual |
|---|---|---|---|
| `role` | ✅ checked | No | Greyed out + badge "vía Rol: X" |
| `direct` | ✅ checked | Yes | Blue outline |
| `none` | ⬜ unchecked | Yes | Normal |

---

## ✅ Backend Tasks

- [ ] 📂 Migration `add_label_to_permissions_table` — adds nullable `label` string column to the `permissions` table (Spatie-managed)
- [ ] 🌱 Update `PermissionSeeder` — populate `label` for every existing permission slug (e.g. `employees.create` → `"Crear empleados"`)
- [ ] 🌐 `GET /api/v1/users/{id}/permissions` — `GetUserPermissionsController`
  - Returns all system permissions grouped by module
  - Each permission: `name` (slug), `label`, `group`, `source` (`role|direct|none`), `via_roles: string[]`
  - Requires `users.show` permission
- [ ] 🌐 `PUT /api/v1/users/{id}/permissions` — `SyncUserDirectPermissionsController`
  - Body: `{ "grant": ["perm.a"], "revoke": ["perm.b"] }`
  - `grant` → `givePermissionTo()` for each slug
  - `revoke` → `revokePermissionTo()` for each slug (removes direct grant only; role grants unaffected)
  - Validates all slugs exist; returns 422 on unknown permission
  - Requires `users.update` permission
  - Returns updated permission list (same shape as GET)
- [ ] 🔧 `UserPermissionsResource` — formats the combined permission state using `getAllPermissions()`, `getDirectPermissions()`, and `getPermissionsViaRoles()`
- [ ] 🧪 Feature tests:
  - GET: `source` is `role` for role-inherited, `direct` for directly granted, `none` for unset
  - GET: `via_roles` lists correct role names when `source = role`
  - PUT grant: slug appears as `direct` in subsequent GET
  - PUT revoke: direct grant removed; if role still grants it, `source` reverts to `role`
  - PUT revoke on a `role`-only permission: no-op (role grant not removed)
  - Unknown slug in grant/revoke → 422
  - Unauthorized: 401/403

---

## ✅ Frontend Tasks

- [ ] 🔧 `src/services/user-permissions.service.ts` — `getUserPermissions(userId)` + `syncUserDirectPermissions(userId, { grant, revoke })`
- [ ] 📝 Types in `src/types/user-permissions.ts`: `PermissionSource`, `UserPermission`, `PermissionGroup`, `SyncPermissionsPayload`
- [ ] 🔧 `usePermissionManager(userId)` hook — fetches permission list, owns sync mutation, tracks local checkbox changes (dirty state), computes delta `{ grant, revoke }` on save
- [ ] 📱 **`PermissionManagerDialog`** (`src/components/employees/permission-manager-dialog.tsx`)
  - Opened by "Gestionar permisos directos →" link in `employee-edit-create-form.tsx`, below the Roles grid
  - Only rendered when `employee.user_id !== null`
  - Header: "Permisos de {employee name}" + subtitle "Los permisos en gris son heredados del rol asignado y no se pueden editar aquí."
  - Permissions grouped by module in `<Accordion>` sections (collapsed by default)
  - Each row: `checkbox` + `label` + optional `via_roles` badge
  - `role` rows: checkbox disabled (checked, grey)
  - `direct` rows: checkbox enabled, blue ring
  - `none` rows: checkbox enabled, unchecked
  - Footer: "Guardar cambios" (disabled if no changes) + "Cancelar"
  - On save: call sync → toast "Permisos actualizados" → close
  - On cancel / close without save: discard local changes

---

## 🧪 Tests

- [ ] ✅ PHPUnit: all backend feature tests listed above
- [ ] ✅ Vitest: `usePermissionManager` — toggling a `none` permission marks it for grant; untoggling a `direct` permission marks it for revoke; save calls sync with correct delta
- [ ] 🌲 Cypress E2E (happy path): Employee slide → "Gestionar permisos directos" → dialog opens → toggle an unset permission → Save → reopen dialog → permission shows as `direct`

---

## 🎯 Acceptance Criteria

- [ ] Permissions inherited via role are shown checked and disabled; no edits possible from this dialog
- [ ] Admin can grant a permission not currently provided by any role
- [ ] Admin can remove a previously direct-granted permission (reverts to `role` or `none`)
- [ ] Save button disabled if no checkbox has changed
- [ ] Closing without saving discards all local changes
- [ ] Link hidden when employee has no linked user account
- [ ] Unknown or invalid slugs return 422 from the API

---

## 🔗 References

- **Depends on:** existing Spatie Permission setup, employee–user link (#086)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `6h` · **Tracked:** —

### 📅 Sessions
```json
[]
```
