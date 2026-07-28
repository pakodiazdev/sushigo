# 🔨 Task #328: Allow Correcting an Already-Recorded Attendance Event

## 📖 Story

**English:**
As an Admin or Manager, I need to correct an already-recorded attendance event within my permitted date range, so that a mistaken check-in/lunch/check-out time can be fixed instead of staying permanently wrong.

**Español:**
Como Admin o Manager, necesito poder corregir un evento de asistencia ya registrado dentro de mi rango de fechas permitido, para poder arreglar una hora de check-in/comida/check-out equivocada en lugar de que quede mal para siempre.

---

## Context

#83 added role/date-based authorization for attendance mutations (`AttendancePolicy::edit`, `useAttendancePermissions`, mandatory `reason` for admin past-day edits, lock icon on non-editable cards) — but it only gates the four **transition** actions (check-in, lunch-start, lunch-return, check-out), each of which can fire only ONCE per attendance record:

- `RegisterCheckInAction::guardNoDuplicateAttendance` — 422 "El empleado ya tiene asistencia registrada para este día."
- `RegisterLunchStartAction::guardNoDuplicateLunchStart` — 422 "La salida a comida ya fue registrada para este día."
- `RegisterLunchReturnAction::guardNoDuplicateLunchEnd` — 422 "El regreso de comida ya fue registrado para este día."
- `RegisterCheckOutAction::guardNoDuplicateCheckOut` — same pattern for check-out

So today there is no way, for any role, to correct a mistaken time once recorded — only to fill in a transition that has not happened yet. There is also no frontend affordance: `TimeRow` (`EmployeeAttendanceCard.tsx`) is a static read-only label.

**Approach — reuse the existing #83 authorization layer, do not rebuild it:**
- `AttendancePolicy::edit(user, attendance)` / `editByDate` already return the correct manager=today / admin=any-day rule
- `AttendanceFormRequest::reasonRules()` already makes `reason` required for admin past-day edits
- `Auditable` / `$attendance->auditReason` already logs corrections with their justification

Supersedes #326 (scoped on the incorrect assumption this authorization layer didn't exist yet).

---

## ✅ Backend Tasks

- [x] 🔧 New permission `attendances.update` ("Corregir asistencia registrada") added to `Development/PermissionSeeder.php` and `Production/PermissionSeeder.php` — covered automatically by the existing `attendances.%` wildcard already assigned to `manager`, `admin`, `super-admin` roles, so it can be revoked per-user via the existing `SyncUserDirectPermissionsController` without touching role code
- [x] 🔨 `RegisterCheckInAction`: relax `guardNoDuplicateAttendance` to only block when there is no existing `check_in` value yet (first-time registration / ABSENCE-LEAVE stub / pending extra-day stub) — once `check_in` is already set, the existing update branch (`$attendance->fill($attendanceData)->save()`) handles the correction
- [x] 🔨 `RegisterLunchStartAction`: remove `guardNoDuplicateLunchStart` — permission is now enforced upstream in the FormRequest
- [x] 🔨 `RegisterLunchReturnAction`: remove `guardNoDuplicateLunchEnd` (same reasoning)
- [x] 🔨 `RegisterCheckOutAction`: remove `guardNoDuplicateCheckOut` (same reasoning)
- [x] 🔧 `CheckInRequest::authorize()`: when an existing attendance for that employee/date already has `check_in` set, additionally require `$this->user()->can('attendances.update')` (on top of the existing date-based admin/today check) — first-time check-in is unaffected
- [x] 🔧 `AttendanceFormRequest`: add a `correctionField(): ?string` hook (default `null`, unused by `OvertimeDecisionRequest`/`PreviewOvertimeValuationRequest`); `authorize()` additionally requires `attendances.update` when the resolved attendance already has that field set. Override in `LunchStartRequest` (`lunch_start`), `LunchReturnRequest` (`lunch_end`), `CheckOutRequest` (`check_out`)
- [x] 🧪 Feature tests: correcting an existing check-in/lunch-start/lunch-return/check-out recalculates the directly-owned derived field (`entry_late_seconds` on check-in, `lunch_late_seconds` on lunch-return), is blocked for a manager on a past day (403, existing #83 rule), is blocked for a manager/admin lacking `attendances.update` (403), first-time registration still works without the permission, and produces an audit log entry with the reason when required (admin + past day)

## ✅ Frontend Tasks

- [x] 📱 Add a pencil edit affordance next to each already-recorded event in `EmployeeAttendanceCard.tsx` (`TimeRow`), shown only when `canEdit && can('attendances.update')` (new `canCorrect` prop threaded from the page)
- [x] 📱 Clicking the pencil opens the existing `AttendanceTimeDialog` for that transition (reusing `onCheckIn` / `onLunchStart` / `onLunchReturn` / `onCheckOut` — same mutations, since the backend now accepts overwrite when authorized), pre-filled with the **existing recorded time** instead of "now" — per the issue's wireframe (`Hora de entrada: [ 09:00 ]`). Requires threading the current ISO value through `PendingAttendanceData` / check-in state so the dialog's `initialTime` can be derived from it
- [x] 📱 Dialog title/copy reflects "Corregir/Editar hora de X" when editing vs "Registrar X" when filling a new transition
- [x] 📱 The Falta (ABSENCE) flow is untouched — this only covers the 4 time transitions
- [x] 🧪 Vitest coverage for the new edit affordance's visibility rules (permission + canEdit) and prefill behavior

---

## 🎯 Acceptance Criteria

- [x] Manager with `attendances.update` (default) or Admin/Super-admin (within their permitted date range) can correct any of the 4 already-recorded attendance events
- [x] A manager without `attendances.update` (revoked per-user) sees no pencil and gets 403 if they call the endpoint directly
- [x] Correcting an event recalculates its directly-owned derived field (entry_late_seconds / lunch_late_seconds)
- [x] Manager cannot correct past-day events (403, matches #83 behavior)
- [x] Every correction is logged in the audit trail with the reason when required
- [x] The Falta/ausencia flow is unaffected by this change

---

## 🔗 References

- Builds on #83 (authorization/reason/audit scaffolding — reused, not duplicated)
- Supersedes #326

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `7h` · **Tracked:** `~6h04m`

### 📅 Sessions
```json
[
  { "date": "2026-07-27", "start": "20:41", "end": "00:44" },
  { "date": "2026-07-28", "start": "00:44", "end": "01:10" },
  { "date": "2026-07-28", "start": "14:20", "end": "15:55" }
]
```

---

## 📊 Retrospective
- **Actual total:** 6h 04m (243 + 26 + 95 min)
- **vs optimistic:** +2h 04m
- **vs pessimistic:** −56m

**Justification:**

Session 1 (implementation) landed within the estimate at 4h03m. The overrun came entirely from post-implementation review cycles across sessions 2–3, which is expected for a change touching authorization, payroll (overtime), and a batch/idempotency path all at once:

- **SonarCloud** flagged 3 code-quality issues across two passes (a 4-return method, a 151-line seeder method, cognitive complexity in both `EmployeeAttendanceCard` and `CloseDayAction`) — all mechanical extract-method fixes, but each required a push + CI + re-scan round trip.
- **Devin/DeepWiki automated review found 3 real bugs**, none of which were caught by the original test suite because each test happened to validate the *wrong* underlying field: (1) the decided-overtime guard checked `OvertimeBankMovement.authorized_at` instead of `Attendance.overtime_authorized_at` — the field the real decision action actually writes; (2) `CloseDayAction`'s batch lunch-return path lost its idempotency safeguard entirely when the duplicate guard was removed, since that path bypasses `LunchReturnRequest` (and the permission gate) altogether; (3) correcting `lunch_start` after `lunch_end` was already recorded left `lunch_late_seconds` stale, since only the check-out/lunch-return derived-field cascade was originally considered. All three now have dedicated regression tests that exercise the real write path instead of a proxy for it.
- **Session 3 also included an unrelated but requested side task**: auditing the session's Bash/MCP tool calls and tuning `.claude/settings.json`'s permission allowlist for a smoother workflow, plus several rounds of narrowing/fixing those patterns (a `git push --force*` deny rule initially also blocked the safe `--force-with-lease` variant; a `curl`/`grep` combination inside a `$(...)` substitution needed its own rule beyond the outer prefix). This was valuable but not part of the original issue scope.

**Lesson for next time:** when a correction/overwrite feature touches a derived field that's computed by more than one action (lunch tardiness by both lunch-start and lunch-return; overtime by both check-out and the decision action), explicitly enumerate every write path for that field up front rather than discovering the missed one via automated review.
