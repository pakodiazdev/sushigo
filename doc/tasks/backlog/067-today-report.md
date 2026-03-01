# 📊 Task #067: View Today's Operational Report

## 📖 Story

**English:**
As a Manager, I want a consolidated view of today's attendance showing each employee's status, tardiness, and overtime flags, so I can quickly assess the operational situation without opening individual records.

**Español:**
Como Manager, quiero una vista consolidada de la asistencia del día con el estado de cada empleado, sus tardanzas e indicadores de horas extra, para evaluar rápidamente la situación operativa sin abrir registros individuales.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/reports/today?branch_id=` — TodayReportController
- [ ] 🔧 Per employee: name, code, role, status (arrived/not_arrived/late/day_off/on_leave), check_in_time, late_minutes, has_overtime, overtime_authorized
- [ ] 🔧 Summary totals: total_employees, arrived, not_arrived, late_count
- [ ] 🧪 Feature tests: mixed statuses, empty branch

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/reports/today.tsx`
- [ ] 🔧 `getTodayReport(branchId)` in `src/services/report.service.ts`
- [ ] 📱 **Today report page** — summary cards at top (total / arrived / not arrived / late); employee table below
- [ ] 📱 **Status badge per employee** — color-coded: verde "A tiempo", amarillo "Tardanza X min", rojo "No registrado", gris "Descanso/Permiso"
- [ ] 📱 Overtime indicator column — flag icon when employee has overtime pending decision
- [ ] 🔧 `useTodayReport(branchId)` hook — auto-refresh every 2 minutes

---

## 🎯 Acceptance Criteria

- [ ] Manager sees all active branch employees with their current status
- [ ] Summary cards reflect accurate totals
- [ ] Page refreshes automatically to reflect new check-ins without manual reload

---

## 🔗 References

- **Backlog:** AP-059 · RF-48

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
