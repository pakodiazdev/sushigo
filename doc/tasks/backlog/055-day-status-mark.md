# 🗓️ Task #055: Mark Day Status — Falta, Descanso, Permiso (Redesign)

## 📖 Story

**English:**
As a Manager, I want to mark an employee's day as "Falta" (unexcused absence) from the Today view, while the system automatically handles "Descanso" (scheduled rest day) and "Permiso" (approved leave) at close-day time, so the weekly close is accurate without requiring redundant manual steps.

**Español:**
Como Manager, quiero marcar el día de un empleado como "Falta" (ausencia no justificada) desde la vista de hoy, mientras el sistema resuelve automáticamente el "Descanso" (día libre según calendario) y el "Permiso" (permiso aprobado) al cerrar el día, para que el cierre semanal sea preciso sin pasos manuales redundantes.

---

## 🧠 Key Design Decisions

- **ABSENCE** is the only status a manager manually assigns from the Today view. It represents an unexcused, unplanned absence.
- **DAY_OFF** is auto-detected at close-day time: if the employee has no attendance and their schedule marks today as a rest day (`ScheduleDay.is_work_day = false` or `ScheduleDayOverride.is_work_day = false`), CloseDayAction marks them as DAY_OFF.
- **LEAVE** is auto-detected at close-day time: if the employee has an approved leave covering today, CloseDayAction marks them as LEAVE.
- Priority in CloseDayAction: `already-has-attendance` → skip; `approved-leave` → LEAVE; `schedule-rest-day` → DAY_OFF; `no-attendance + work-day` → ABSENCE.
- The "Registrar ausencia" button (which created LEAVE directly) is **removed** from the Today view card — leave registration belongs in the Employee Detail leave tab (#077/#078). Leave requests flow through #096.
- The "Marcar día" dropdown (DAY_OFF | ABSENCE) is **replaced** by a single "Marcar falta" button.
- The backend endpoint is narrowed to accept **only ABSENCE** (DAY_OFF is system-managed).
- Today view shows a `Descanso programado` indicator (read-only) if the schedule marks today as a rest day, so managers are not confused by why the employee is absent.

---

## ✅ Backend Tasks

- [x] 🌐 `POST /api/v1/attendances/day-status` — `MarkDayStatusController`
- [x] 📝 `DayStatusRequest` — `{ employee_id, date, day_status: DAY_OFF|ABSENCE }`
- [x] 🔧 `MarkDayStatusAction` — creates Attendance with day_status, guards duplicate 422
- [x] 🧪 10 PHPUnit feature tests (mark day-off, mark absence, duplicate, unknown employee, invalid status, etc.)
- [ ] 🔧 **Narrow endpoint**: Update `DayStatusRequest` validation to **reject DAY_OFF** (only ABSENCE allowed going forward); update existing tests to assert DAY_OFF returns 422
- [ ] 🔧 **CloseDayAction fix** — add pre-ABSENCE logic:
  1. If employee has an approved `Leave` covering today → set `day_status = LEAVE`
  2. Else if schedule resolves today as a rest day (use `resolveEffectiveScheduleDay`) → set `day_status = DAY_OFF`
  3. Else → set `day_status = ABSENCE` (existing behavior)
- [ ] 🧪 PHPUnit tests for updated CloseDayAction:
  - Employee with approved leave today → marked LEAVE, not ABSENCE
  - Employee with schedule rest day today → marked DAY_OFF, not ABSENCE
  - Employee with no attendance and no leave/rest → marked ABSENCE (regression)
  - Employee with check_in present → NOT re-closed (regression)

## ✅ Frontend Tasks

- [x] 📝 Extended `AttendancePhase` with `'day-off'` and `'absence'`
- [x] 📝 Updated `getAttendancePhase()` to resolve DAY_OFF and ABSENCE before the check_in null check
- [x] 🎨 `PhaseBadge` cases for `'day-off'` (Descanso) and `'absence'` (Falta)
- [x] 🎨 `getPhaseCardClass` entries for `'day-off'` and `'absence'`
- [x] 🔧 `attendanceApi.markDayStatus()` — POST to `/attendances/day-status`
- [x] 🔧 `useMarkDayStatus()` hook — mutation, invalidates today query, shows toast
- [x] 📱 "Marcar día" dropdown (Descanso | Falta) on pending cards — **to be replaced**
- [ ] 📱 **Replace dropdown** with single "Marcar falta" button on pending cards:
  - Remove `useState(isMarkDayOpen)`, `DropdownMenu`, and all dropdown imports
  - Replace with a plain `<Button>` labeled "Marcar falta" with a `UserX` icon
  - Clicking shows a minimal `AlertDialog` confirmation: "¿Confirmar que [Nombre] faltó hoy? Esta acción no se puede deshacer." — Confirmar / Cancelar
  - On confirm: calls `onMarkDayStatus(employee, 'ABSENCE')`
- [ ] 📱 **Remove "Registrar ausencia" button** from the pending card section
- [ ] 📱 **Scheduled rest-day indicator**: when `row.schedule` resolves today as a non-work-day, show a read-only `Descanso programado` chip instead of action buttons (employee is expected off — no action needed today)
- [ ] 🔧 Remove `onRegisterLeave` prop and `onMarkDayStatus` DAY_OFF path from `EmployeeAttendanceCard` (and update its tests)
- [ ] 🔧 Remove `registerLeave` from `useTodayAttendancePage` hook and `today.tsx`

---

## 🧪 Tests

- [x] ✅ PHPUnit: 10 feature tests (all passing)
- [x] ✅ Vitest: `getAttendancePhase` day-off/absence, `PhaseBadge` day-off/absence, `getPhaseCardClass` day-off/absence, `useMarkDayStatus` mutations
- [x] 🌲 Cypress E2E: mark Carlos as Descanso, mark María as Falta
- [ ] ✅ Vitest: update `EmployeeAttendanceCard` tests — remove dropdown/onRegisterLeave tests, add "Marcar falta" button + AlertDialog confirmation tests
- [ ] 🌲 Cypress E2E: update spec — use "Marcar falta" button + confirmation dialog instead of dropdown; remove DAY_OFF spec (auto-managed)
- [ ] ✅ PHPUnit: CloseDayAction tests (LEAVE, DAY_OFF, ABSENCE priority)

---

## 🎯 Acceptance Criteria

- [ ] Manager sees a single "Marcar falta" button on pending cards (no dropdown)
- [ ] Clicking "Marcar falta" shows a confirmation dialog before submitting
- [ ] Card updates to show "Falta" badge without page reload
- [ ] Cards for employees on a scheduled rest day show a read-only indicator — no action buttons
- [ ] CloseDayAction correctly classifies: approved leave → LEAVE, schedule rest day → DAY_OFF, otherwise → ABSENCE
- [ ] "Registrar ausencia" button no longer exists on Today view cards
- [ ] DAY_OFF cannot be set via the API endpoint (returns 422)

---

## 🔗 References

- **Backlog:** AP-019 · RF-16
- **Depends on:** #054 (Today view), #053 (schedule data on row)
- **Blocks:** #098 (Today view leave context), #096 (leave request flow)

---

## ⏱️ Estimates

- **Remaining:** `2h backend (CloseDayAction fix + tests) + 1.5h frontend (card redesign + tests)`
