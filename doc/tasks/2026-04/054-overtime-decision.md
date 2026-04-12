# ⏱️ Task #054: Authorize or Reject Overtime Payment

## 📖 Story

**English:**
As a Manager, I want to decide whether to pay an employee's overtime hours after they check out, so I can control payroll expenses on a day-by-day basis.

**Español:**
Como Manager, quiero decidir si se pagan las horas extra de un empleado después de que registra su salida, para controlar los gastos de nómina día a día.

---

## ✅ Backend Tasks

- [x] 🌐 `PATCH /api/v1/attendances/{id}/overtime-decision` — OvertimeDecisionController
- [x] 📝 OvertimeDecisionRequest — `{ authorize: true|false }`
- [x] 🔧 If `authorize = true`: set `overtime_authorized = true`, store `overtime_authorized_by` and `overtime_authorized_at`
- [x] 🔧 If `authorize = false`: set `overtime_authorized = false`, set `overtime_authorized_at` to mark decision recorded
- [x] 🔧 422 if `overtime_minutes = 0` (no overtime to decide on) or decision already recorded
- [x] 🧪 Feature tests: authorize, reject, no overtime, already decided (both authorize/reject), validation, 404, 401

## ✅ Frontend Tasks

- [x] 📝 Updated `TodayAttendanceData` type in `src/types/attendance.ts` — added `overtime_authorized`, `overtime_authorized_at`
- [x] 🔧 `overtimeDecision(attendanceId, data)` added to `src/services/attendance-api.ts`
- [x] 🔧 `useOvertimeDecision()` hook added to `src/services/attendance-hooks.ts`
- [x] 🔧 Overtime decision state added to `useTodayAttendancePage` hook
- [x] 📱 **Overtime decision UI** — `OvertimeDecisionDialog` component with "Pagar" / "No pagar" buttons
- [x] 📱 `OvertimeDecisionBadge` — shows "Pagadas" (green) or "No pagadas" (gray) after decision
- [x] 📱 `EmployeeAttendanceCard` updated — shows decision button when pending, badge when decided
- [x] 📱 `today.tsx` wired to `OvertimeDecisionDialog`

---

## 🎯 Acceptance Criteria

- [x] Manager sees "Decidir horas extra" button only for employees with overtime and without a prior decision
- [x] After the decision, button is replaced by a "Pagadas" or "No pagadas" badge
- [x] 422 from API (no overtime / already decided) shows a user-friendly error toast

---

## 🔗 References

- **Backlog:** AP-016, AP-018 · RF-47a, RF-47b, RF-48, DC-01

---

## ⏱️ Completed

- **Branch:** `feature/054-overtime-decision`
- **Completed:** 2026-04-12
