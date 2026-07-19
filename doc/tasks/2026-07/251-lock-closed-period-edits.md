# 🔒 Task #251: Lock Attendance/Payroll-Input Edits for Dates Covered by a CLOSED Pay Period

**GitHub Issue:** [#251](https://github.com/pakodiazdev/sushigo/issues/251)

## 📖 Story

**English:**
As an Admin who has closed a weekly pay period, I want every endpoint that writes attendance/overtime/leave/extra-day data for a date already frozen inside a `CLOSED` `PayPeriod` to reject the edit, so that a closed period's totals can never silently drift out of sync with the underlying records without going through the existing reopen/reclose flow (#076).

**Español:**
Como Admin que ya cerró un periodo de pago semanal, quiero que cualquier endpoint que escriba datos de asistencia/horas extra/permisos/días extra para una fecha ya congelada dentro de un `PayPeriod` `CLOSED` rechace la edición, para que los totales de un periodo cerrado nunca se desincronicen silenciosamente de los registros subyacentes sin pasar por el flujo existente de reapertura/recierre (#076).

---

## 🧠 Context

#076 (reopen/reclose) lets an Admin unlock a `CLOSED` `PayPeriod` for correction and refreeze it via `reclose`. But no endpoint that writes data feeding `PayPeriodPreviewService::buildEmployeePreview()` (`app/Services/PayPeriodPreviewService.php`) actually checks `PayPeriod` status today — confirmed by reading every controller that writes to the tables the preview reads from (`attendances`, `overtime_bank_movements`, `partial_leaves`, `negotiated_extra_days`, `WageHistory`, schedules, holidays, punctuality config). None of them reference `App\Models\PayPeriod` in any way.

`PayPeriod` rows only exist once a period is closed (`ConfirmCloseController` creates the row directly with `status = CLOSED`). There is no helper anywhere to answer "does branch X have a CLOSED PayPeriod covering date Y?" — so no controller can cheaply guard against editing history that's already been paid out.

**Scope decision for this task (confirmed with the user):** cover only the endpoints the issue's own analysis prioritizes first — attendance mutations, overtime decision, negotiated extra days, direct leave, and manual overtime bank adjustment. Wage (`CreateWageController`), schedule (`CreateScheduleController`/`UpdateScheduleController`/`CreateScheduleDayOverrideController`), and global config (holidays, punctuality ranges, overtime LFT tiers) are lower-priority per the issue itself and are deferred to a follow-up issue.

**Block behavior (confirmed with the user):** 422 Validation Error, consistent with the `ValidationException` pattern already used by `ReopenPayPeriodController`/`ReclosePayPeriodController` — not a new 409 convention.

---

## ✅ Backend Tasks

- [x] 🔧 Add `PayPeriod::coveringDate(int $branchId, string $date): ?PayPeriod` to find the period (any status) covering a branch + date
- [x] 🔧 Add `App\Actions\Payroll\EnsurePeriodIsEditableAction` — returns `false` when the covering period is `CLOSED`, `true` otherwise (including reopened/no period)
- [x] 🔧 Add `App\Http\Requests\Concerns\GuardsClosedPayPeriod` trait — shared `guardClosedPeriod()` helper (adds a validator error via `withValidator`/`after`) and `activeBranchIdForEmployee()` helper
- [x] 🔧 Wire the guard into `AttendanceFormRequest` (base class) — covers `CheckOutRequest`, `LunchStartRequest`, `LunchReturnRequest`, `OvertimeDecisionRequest` in one change, keyed off the attendance's existing `date` + employee's active branch
- [x] 🔧 Wire the guard into `CheckInRequest` (employee_id + `check_in` date, not yet an existing attendance)
- [x] 🔧 Wire the guard into `DayStatusRequest` (employee_id + `date`)
- [x] 🔧 Wire the guard into `StoreNegotiatedExtraDayRequest` (employee_id + `date`)
- [x] 🔧 Add the guard check directly in `CancelNegotiatedExtraDayController` (no FormRequest exists there — follows its existing inline `ValidationException` pattern), using the record's own `branch_id` + `date`
- [x] 🔧 Wire the guard into `RegisterDirectLeaveRequest` (employee_id + `dates[]` — block if **any** date in the array falls inside a closed period)
- [x] 🔧 Wire the guard into `StoreManualOvertimeMovementRequest` (route-bound `Employee $employee` + `date`)
- [x] 🧪 Unit test for `EnsurePeriodIsEditableAction` / `PayPeriod::coveringDate`
- [x] 🧪 Feature tests added to each guarded endpoint's existing test file: editable with no period, blocked (422) when `CLOSED`, editable again once `REOPENED`

---

## 🎯 Acceptance Criteria

- [x] Any attempt to check in/out, mark lunch, mark day status, decide overtime, register/cancel a negotiated extra day, register a direct leave, or post a manual overtime movement for a date inside a `CLOSED` `PayPeriod` for that branch returns 422 with a clear message pointing to reopening the period
- [x] The same operations succeed normally when there is no covering period, or when the covering period is `OPEN` or `REOPENED`
- [x] `RegisterDirectLeaveRequest` blocks if **any** date in a multi-day leave request falls inside a closed period
- [x] No behavior change for wage, schedule, or global-config endpoints (explicitly out of scope — tracked as a follow-up)

---

## 🔗 References

- Builds on #076 (reopen/reclose pay periods) — this gap was flagged during Devin PR review on that PR
- `PayPeriodPreviewService::buildEmployeePreview()` — `app/Services/PayPeriodPreviewService.php`
- `PayPeriod` model — `app/Models/PayPeriod.php`
- Backlog: AP-047 (`doc/modules/attendance-payroll/attendance-payroll-backlog.en.md:724`)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `6h` · **Pessimistic:** `10h` · **Tracked:** `2h 26m`

### 📅 Sessions
```json
[
  { "date": "2026-07-18", "start": "17:41", "end": "18:22" },
  { "date": "2026-07-19", "start": "13:15", "end": "14:15" },
  { "date": "2026-07-19", "start": "16:10", "end": "16:55" }
]
```

## 📊 Retrospective
- **Actual total:** 2h 26m (41 min + 60 min + 45 min)
- **vs optimistic:** −3h 34m
- **vs pessimistic:** −7h 34m

**Justification:**

The core implementation (session 1) landed comfortably under estimate because the scope was deliberately narrowed up front to the 9 highest-priority endpoints called out in the issue itself, and the FormRequest-based guard pattern (a single shared trait + `withValidator`) reused cleanly across all of them — only `AttendanceFormRequest` needed touching to cover 4 endpoints at once.

Two follow-up sessions were needed to address automated PR review feedback, which is normal review-cycle overhead rather than scope creep:
- Session 2 fixed a real correctness bug the reviewer caught: branch resolution filtered on `is_active = true`, which silently bypassed the lock for terminated or transferred employees — exactly the case where retroactive payroll edits matter most. Also fixed a `dates` vs `date` field-naming inconsistency and two backslash-FQCN convention violations.
- Session 3 was a routine SonarCloud pass — the quality gate already passed, but one method exceeded the cognitive-complexity threshold (16 vs 15 allowed) and was split into two smaller helpers.

None of this required re-scoping or architectural rework — it stayed well within even the optimistic estimate.
