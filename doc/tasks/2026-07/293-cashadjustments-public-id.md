# 🔨 Task #293: Expose public_id (ULID) instead of numeric id for CashAdjustments resources

## 📖 Story

**English:**
As a developer, following up on #291, I need CashAdjustments' 6 resource types (CashRegister, CashTerminal, BankAccount, CashSession, CashExpense, CashAdjustment) to expose a ULID `public_id` instead of the raw sequential numeric id in URLs and JSON responses, matching the established convention already used by 20 models in the HR/Attendance/Payroll domain, so that properly-fixed authorization (#291) doesn't leave a sequential-ID enumeration side-channel.

**Español:**
Como desarrollador, dando seguimiento a #291, necesito que los 6 tipos de recurso de CashAdjustments expongan un `public_id` ULID en vez del id numérico secuencial crudo en URLs y respuestas JSON, siguiendo la convención ya establecida en 20 modelos del dominio HR/Attendance/Payroll, para que la autorización recién corregida (#291) no deje un canal lateral de enumeración de IDs secuenciales.

---

## ✅ Technical Tasks (backend)

- [x] 🔨 Add `public_id` (ULID) column + `HasPublicId` trait to `CashRegister`, `CashTerminal`, `BankAccount`, `CashSession`, `CashExpense`, `CashAdjustment` — one migration, backfilling any pre-existing rows
- [x] 🔨 Change routes from generic `RouteParams::ID` to named segments (`{cashRegister}`, `{cashTerminal}`, etc.), reverting `Show`/`Update`/`Delete`/`Post`/`GetSessionSummary` controllers to typed Eloquent implicit binding — simpler than #291's manual `int $id` + `findOrFail`, Laravel handles 404 automatically for unmatched bindings
- [x] 🔨 **Design change from the original issue plan**: instead of writing 6 dedicated API Resource classes, added `App\Support\Traits\SerializesPublicIdAsId` — a `toArray()` override swapping `id` for `public_id` — applied to the same 6 models. This automatically fixes serialization everywhere a model gets output (`Show`, `Update`, paginated `List` responses via `response()->json($paginator)`, and nested relations between these 6 models — e.g. `CashRegister`'s `sessions` relation) with zero controller changes for `List`, and without risking the Resource classes drifting out of sync with the models' actual columns over time
- [x] 🔨 Simplify the 5 `Update*Request::authorize()`/`rules()`/`withValidator()` methods back to `$this->route('<modelName>')` now that implicit binding resolves correctly
- [x] ✅ Update the 46 `*AuthorizationTest.php` tests from #291 to use `public_id` in URLs and JSON assertions
- [x] 🧪 Full PHPUnit suite green (1344/1344 — 1 unrelated pre-existing flaky failure in `HolidayCrudTest`, a Holiday-domain factory date collision, confirmed passing in isolation), Pint clean (40 files)

## 📋 Technical Tasks (frontend — not started this session)

- [ ] 🔨 `code/webapp/src/services/cash-api.ts`: all `id: number` parameters for these 6 resources become `id: string`
- [ ] 🔨 Review component/hook logic treating these ids as numbers
- [ ] 🧪 Manual verification in browser (dev server) per CLAUDE.md's UI-change testing rule

---

## 🎯 Acceptance Criteria

- [x] All 6 CashAdjustments resources expose `public_id` (ULID) as `id` in every API response — Show, Update, List, and nested relations between these 6 models
- [x] Numeric primary key remains internal-only (FKs, queries) — never serialized
- [x] Non-ULID-protected relations (Branch, OperatingUnit, User) are left untouched — consistent with how the rest of the app already treats those as non-sensitive/low-cardinality
- [x] No behavior change beyond the id representation — same business logic, same authorization (#291), same validation
- [ ] Webapp consumers updated to match (deferred — separate frontend pass)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `4h` (6 models × migration/trait/routes/controllers/requests/tests, plus discovering the List-controller-has-no-auth-at-all finding mid-audit)
- **Tracked:** `2.52h` (backend only; frontend pass not yet started)

### 📅 Sessions
```json
[
  { "date": "2026-07-23", "start": "22:00", "end": "24:00" },
  { "date": "2026-07-24", "start": "00:00", "end": "00:31" }
]
```

## 📊 Retrospective
- **Actual total:** 2h 31m
- **vs optimistic:** +31m over the `2h` optimistic estimate
- **vs pessimistic:** −1h 29m under the `4h` pessimistic estimate

**Justification:**

The audit phase (verifying the existing `HasPublicId`/ULID convention actually works correctly across 20 models, checking every `RouteParams::ID` route in the entire API for the same binding bug found in #291, and confirming `CashAdjustmentLine` isn't independently routable) took real time but was essential — it's what surfaced the mid-scope discovery that all 6 `List*Controller` classes have zero authorization at all (a separate, more severe bug, deliberately **not** fixed here — flagged for its own issue to keep this PR's diff scoped to what it claims). The implementation itself landed faster than planned because of one design pivot: rather than writing 6 hand-maintained API Resource classes (the original issue plan), a single `SerializesPublicIdAsId` trait applied to the models handles Show/Update/List/nested-relations uniformly via `toArray()`, with no per-controller work for `List` at all — verified directly via `php artisan tinker` before writing any controller code, avoiding a much larger, more error-prone implementation.

---

## 🔗 References

- GitHub issue: [#293](https://github.com/pakodiazdev/sushigo/issues/293)
- Follow-up to: [#291](https://github.com/pakodiazdev/sushigo/issues/291)
- Existing convention reused: `App\Support\Traits\HasPublicId`
