# 🐛 Task #295: CashAdjustments List endpoints have no authorization or branch-scoping

## 📖 Story

**English:**
As a developer, I need to add resource-level authorization and branch-scoping to the CashAdjustments domain's `List*Controller` classes, so that only users with the `.view` permission can list cash registers/terminals/bank accounts/sessions/expenses/adjustments, and each user only sees records within their assigned branch(es) — matching the protection already applied to Show/Update/Delete/Post by #291.

**Español:**
Como desarrollador, necesito agregar autorización a nivel de recurso y filtrado por sucursal a los controladores `List*` del dominio CashAdjustments, para que solo los usuarios con el permiso `.view` puedan listar cajas/terminales/cuentas bancarias/sesiones/gastos/ajustes, y cada usuario solo vea registros de su(s) sucursal(es) asignada(s) — igualando la protección ya aplicada a Show/Update/Delete/Post en #291.

---

## 🔍 Root cause

All 6 `List*Controller` classes (`ListCashRegistersController`, `ListCashTerminalsController`, `ListBankAccountsController`, `ListCashSessionsController`, `ListCashExpensesController`, `ListCashAdjustmentsController`) call **zero** authorization checks — not even `viewAny()`, which every policy already defines. Routes only apply `auth:api` (login check). Any authenticated user, regardless of role/permission, can list every record across all branches.

`branch_id` exists as an optional query filter on 3 of the 6 endpoints, but nothing stops a user from omitting it (seeing every branch) or passing a `branch_id` they have no access to.

Discovered during the #291/#293 audit, deliberately deferred until those PRs settled (see PR #294 discussion).

---

## ✅ Technical Tasks

- [ ] 🔒 Add `Gate::authorize('viewAny', Model::class)` to all 6 `List*Controller` classes
- [ ] 🔒 Scope each `List` query to the requesting user's assigned branches via `$user->operatingUnits()->wherePivot('is_active', true)->pluck('branch_id')`:
  - `CashRegister`, `CashTerminal`, `BankAccount`: direct `branch_id` column — `whereIn`
  - `CashSession`: via `cashRegister.branch_id` — `whereHas`
  - `CashExpense`, `CashAdjustment`: via `cashSession.cashRegister.branch_id` — nested `whereHas`
- [ ] 🔒 An explicit `branch_id` filter the user doesn't have access to is silently excluded via the same scoping (no separate 403) — consistent with how list endpoints avoid leaking existence via error codes
- [ ] ✅ Feature tests per domain: a user assigned to branch A doesn't see branch B's records in `List`, even without an explicit `branch_id` filter; a user without the `.view` permission gets `403`
- [ ] 🧪 Full PHPUnit suite green, Pint clean

---

## 🎯 Acceptance Criteria

- [ ] All 6 `List` endpoints reject users lacking the corresponding `.view` permission with `403`
- [ ] All 6 `List` endpoints only return records within the requesting user's assigned branch(es), with or without an explicit `branch_id` filter
- [ ] No behavior change for users who already have proper branch access and permission
- [ ] No behavior change to `Create`/`Show`/`Update`/`Delete`/`Post` (untouched)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` (mechanical repeat of the #291 branch-scoping pattern across 6 controllers)
- **Pessimistic:** `2h` (6 domains × query scoping + tests, plus verifying existing List tests still pass)
- **Tracked:** _in progress_

### 📅 Sessions
```json
[
  { "date": "2026-07-24", "start": "17:00", "end": "?" }
]
```

---

## 🔗 References

- GitHub issue: [#295](https://github.com/pakodiazdev/sushigo/issues/295)
- Discovered during #293's audit (public_id migration) — see PR #294 discussion
- Reuses `App\Policies\Concerns\ChecksBranchAccess` pattern from #291
