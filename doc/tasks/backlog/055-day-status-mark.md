# 🗓️ Task #055: Mark Day as Day-Off or Absence

## 📖 Story

**English:**
As a Manager, I want to mark a day as a day-off or absence for an employee without registering check-in or check-out, so the system can correctly account for that day in the weekly close.

**Español:**
Como Manager, quiero marcar un día como descanso o ausencia para un empleado sin registrar entrada ni salida, para que el sistema contabilice correctamente ese día en el cierre semanal.

---

## ✅ Backend Tasks

- [ ] 🌐 `POST /api/v1/attendances/day-status` — DayStatusController
- [ ] 📝 DayStatusRequest — `{ employee_id, date, day_status: DAY_OFF|ABSENCE }`
- [ ] 🔧 Creates an Attendance record without check_in/check_out
- [ ] 🔧 422 if an attendance record already exists for that employee/date
- [ ] 🧪 Feature tests: mark day-off, mark absence, duplicate rejected

## ✅ Frontend Tasks

- [ ] 📱 **"Marcar día" action** on each row in the Today view (#054) — dropdown button with options: "Descanso" / "Ausencia"
- [ ] 📱 Only visible for employees with no attendance record yet for today
- [ ] 📱 After marking: row updates to show the corresponding day_status badge (no reload needed)
- [ ] 🔧 `markDayStatus(employeeId, date, status)` in `src/services/attendance.service.ts`
- [ ] 🔧 Mutation added to `useTodayView` hook

---

## 🎯 Acceptance Criteria

- [ ] Manager can mark "Descanso" or "Ausencia" from the Today view
- [ ] Row immediately reflects the new status after the action
- [ ] Action is hidden for employees who already have an attendance record

---

## 🔗 References

- **Backlog:** AP-019 · RF-16

---

## ⏱️ Estimates

- **Optimistic:** `1h` · **Pessimistic:** `2h`
