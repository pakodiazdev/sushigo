# ⏱️ Task #054: Authorize or Reject Overtime Payment

## 📖 Story

**English:**
As a Manager, I want to decide whether to pay an employee's overtime hours after they check out, so I can control payroll expenses on a day-by-day basis.

**Español:**
Como Manager, quiero decidir si se pagan las horas extra de un empleado después de que registra su salida, para controlar los gastos de nómina día a día.

---

## ✅ Backend Tasks

- [ ] 🌐 `PATCH /api/v1/attendances/{id}/overtime-decision` — OvertimeDecisionController
- [ ] 📝 OvertimeDecisionRequest — `{ authorize: true|false }`
- [ ] 🔧 If `authorize = true`: set `overtime_authorized = true`, store `overtime_authorized_by` and `overtime_authorized_at`
- [ ] 🔧 If `authorize = false`: set `overtime_authorized = false`
- [ ] 🔧 422 if `overtime_minutes = 0` (no overtime to decide on) or decision already recorded
- [ ] 🧪 Feature tests: authorize, reject, no overtime, already decided

## ✅ Frontend Tasks

- [ ] 📝 Add `Attendance`, `DayStatus` types to `src/types/attendance-payroll.ts`
- [ ] 📂 Create route `src/pages/attendance/today.tsx` — Today view listing all active employees for the branch
- [ ] 🔧 `getTodayAttendance(branchId)` + `recordOvertimeDecision(attendanceId, authorize)` in `src/services/attendance.service.ts`
- [ ] 📱 **Today view** — table row per employee showing: name, code, role, check_in, lunch_end, check_out, day_status, late_minutes
- [ ] 📱 **Overtime decision UI** — when `overtime_minutes > 0` and no decision yet: "Pagar" / "No pagar" buttons visible in the row; after decision: badge "Pagadas" or "No pagadas"
- [ ] 🔧 `useTodayView(branchId)` hook — query + overtime decision mutation

---

## 🎯 Acceptance Criteria

- [ ] Manager sees "Pagar" / "No pagar" buttons only for employees with overtime and without a prior decision
- [ ] After the decision, buttons are replaced by a status badge
- [ ] 422 from API (no overtime / already decided) shows a user-friendly message

---

## 🔗 References

- **Backlog:** AP-016, AP-018 · RF-47a, RF-47b, RF-48, DC-01

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
