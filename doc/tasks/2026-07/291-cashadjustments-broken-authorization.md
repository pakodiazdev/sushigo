# 🐛 Task #291: CashAdjustments Show/Update/Delete/Post endpoints operate on blank models with no resource-level authorization

## 📖 Story

**English:**
As a developer, I need to fix the CashAdjustments domain's broken route-model-binding and missing resource-level authorization, so that Show/Update/Delete/Post endpoints across all 6 resource types (CashRegister, CashTerminal, BankAccount, CashSession, CashExpense, CashAdjustment) operate on the correct record and are properly access-controlled, instead of silently operating on blank models with no permission/branch checks.

**Español:**
Como desarrollador, necesito corregir el binding de modelos y la autorización faltante en el dominio de CashAdjustments, para que los endpoints Show/Update/Delete/Post de los 6 tipos de recurso (CashRegister, CashTerminal, BankAccount, CashSession, CashExpense, CashAdjustment) operen sobre el registro correcto y estén correctamente controlados por permisos/sucursal, en vez de operar silenciosamente sobre modelos vacíos sin ningún control.

---

## 🔍 Root cause (3 compounding bugs)

1. **Route/controller model-binding mismatch**: routes use generic `RouteParams::ID` (`/{id}`), but controllers type-hinted an Eloquent model with a *different* variable name (e.g. `CashRegister $cashRegister`). Laravel's implicit binding requires the segment name to match, so it silently fell back to constructing a **blank model** via the DI container instead of erroring. Confirmed empirically: `GET /api/v1/cash-registers/{id}` on a real seeded register returned `200` with `"branch": null`.
2. **Zero resource-level authorization** on `Show`/`Delete`/`Post` controllers — no `$this->authorize()`/`Gate::authorize()` calls anywhere, and routes only apply `auth:api` (login check), no `can:` middleware. Any authenticated user could view/delete/post any resource regardless of permission or branch.
3. **Broken policies and FormRequests**: all 6 `*Policy::userHasBranchAccess()` called `$user->operatingUnitUsers()` — not a real relation (`User` only defines `operatingUnits(): BelongsToMany`) — `BadMethodCallException`. 5 `Update*Request::authorize()` methods called `$this->route('<modelName>')`, always `null` for the same reason as #1.

Zero Feature tests existed for `Show`/`Update`/`Delete`/`Post` on any of the 6 resources — only `Create` was tested — which is why this went unnoticed.

---

## ✅ Technical Tasks

- [x] 🔨 Extract `App\Policies\Concerns\ChecksBranchAccess` trait with the corrected `userHasBranchAccess()` (`$user->operatingUnits()->wherePivot('is_active', true)->where('branch_id', $branchId)->exists()`), used by all 6 policies instead of each repeating the broken method
- [x] 🔨 Change `Show`/`Update`/`Delete`/`Post` controllers across all 6 resources to `int $id` + `Model::findOrFail($id)`, matching the codebase-wide convention already used by Items/InventoryLocation
- [x] 🔨 Add explicit `Gate::authorize(...)` calls to `Show`/`Delete`/`Post` controllers (previously missing entirely) — `Update` gets authorization via its FormRequest as before
- [x] 🔨 Fix the 5 `Update*Request::authorize()`/`rules()`/`withValidator()` methods referencing `route('<modelName>')` to resolve the model from `route('id')` instead, `abort(404)` when not found
- [x] ✅ Add Feature tests (`*AuthorizationTest.php`, one per resource, 46 tests total) covering: correct record returned/mutated (not blank), 403 for wrong branch, 403 for missing permission, 404 for nonexistent id
- [x] 🧪 Full PHPUnit suite green (1337/1337), Pint clean (39 files)

---

## 🎯 Acceptance Criteria

- [x] `Show`/`Update`/`Delete`/`Post` operate on the actual requested record across all 6 resource types
- [x] Users without the branch assignment or permission get `403`, not silent success
- [x] Nonexistent ids get `404`
- [x] No behavior change to `Create`/`List` (untouched) or to any already-correct business logic (isPosted checks, tender-type validation, delete-with-existing-transactions guards)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1.5h` (mostly mechanical once the pattern is established per domain)
- **Pessimistic:** `3h` (6 domains × 4 layers each — policy, controller, request, tests — plus verifying no regressions in already-fragile CashAdjustments logic)
- **Tracked:** `1.5h`

### 📅 Sessions
```json
[
  { "date": "2026-07-23", "start": "20:30", "end": "22:00" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 30m
- **vs optimistic:** on target
- **vs pessimistic:** −1h 30m under

**Justification:**

Landed at the optimistic estimate. The investigation phase (confirming the bug empirically via `php artisan tinker` and a throwaway probe test, then cross-referencing every other domain's routing convention to find the established `int $id` pattern) took real time but paid for itself immediately — it revealed the correct, codebase-consistent fix on the first attempt instead of guessing at a bespoke solution. Once the CashRegister domain was fixed and its test file passed cleanly (9/9), the remaining 5 domains were a direct repeat of the same pattern with domain-specific field/action differences (CashSession/CashExpense/CashAdjustment's `post`/`isPosted` logic, CashExpense's already-existing tender-type validation from #289 that had to be preserved carefully). One full-suite run showed 31 unrelated `QueryException: relation "permissions" does not exist` failures in Attendance/Payroll tests — confirmed as pre-existing test-environment flakiness (not caused by this change) by re-running clean with 0 failures.

---

## 🔗 References

- GitHub issue: [#291](https://github.com/pakodiazdev/sushigo/issues/291)
- Discovered during PR #288 review (SonarCloud duplication cleanup, unrelated)
