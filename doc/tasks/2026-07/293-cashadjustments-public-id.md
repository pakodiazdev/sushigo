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
- **Tracked:** `7.9h` (5.6h backend, PR #294 merged; +2h17m frontend + review pass, PR #299)

### 📅 Sessions
```json
[
  { "date": "2026-07-23", "start": "22:00", "end": "24:00" },
  { "date": "2026-07-24", "start": "00:00", "end": "00:31" },
  { "date": "2026-07-24", "start": "07:30", "end": "10:35" },
  { "date": "2026-07-24", "start": "14:26", "end": "16:43" }
]
```

## 📊 Retrospective
- **Actual total:** 5h 36m (120 min + 31 min + 185 min)
- **vs optimistic:** +3h 36m over the `2h` optimistic estimate
- **vs pessimistic:** +1h 36m over the `4h` pessimistic estimate

**Justification:**

The initial implementation session (2h 31m) landed close to estimate, helped by a design pivot — a single `SerializesPublicIdAsId` trait instead of 6 hand-maintained API Resource classes, verified directly via `php artisan tinker` before writing controller code. The overrun came entirely from the review/hardening pass that followed PR #294 being opened, which surfaced real, shippable bugs the original scope hadn't accounted for:

- A `/sonar-review` cycle fixing SonarCloud-flagged duplicated route-segment literals (2 iterations, new `CashAdjustmentRouteParams` class).
- A **critical bug found via automated PR review**: the ULID migration changed API *output* to `public_id` but left every write endpoint (`Store`/`Update` requests for CashSession/CashExpense/CashAdjustment) and every List filter (`cash_register_id`, `cash_session_id` query params) still validating/filtering against the old numeric `id`. Since the API no longer returns any numeric id, this made it impossible to create/update CARD or TRANSFER expenses/adjustments, open sessions, or filter lists — a complete write-path break, not a cosmetic issue. Fixed with two new resolver traits (`ResolvesPublicIdReferences` for FormRequests, `ResolvesPublicIdFilters` for List controllers) that accept `public_id` and resolve it to the numeric FK internally.
- A residual leak (`CashAdjustmentLine.cash_adjustment_id` not hidden) caught via `/pr-comments`.
- Documentation follow-up (unrelated but bundled per user request): added the `Devin Review:` link convention to both repos' `CLAUDE.md`, with matching issue/PR in `sushigo-dev-lab` (#58/#59).

None of this was scope creep in the harmful sense — the write-path bug in particular would have shipped a broken feature (CARD/TRANSFER cash operations silently unusable) had it not been caught before merge. The pessimistic estimate didn't anticipate a review pass finding a functional regression this deep, which is the main driver of the overrun.

---

## 🔗 References

- GitHub issue: [#293](https://github.com/pakodiazdev/sushigo/issues/293)
- Follow-up to: [#291](https://github.com/pakodiazdev/sushigo/issues/291)
- Existing convention reused: `App\Support\Traits\HasPublicId`
