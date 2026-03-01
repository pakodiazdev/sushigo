# 📋 Task #056: View Current Schedule

## 📖 Story

**English:**
As an Admin or Manager, I want to see an employee's current active schedule with all 7 days and expected times, so I can verify what the system will use for tardiness calculations.

**Español:**
Como Admin o Manager, quiero ver el horario activo actual de un empleado con los 7 días y tiempos esperados, para verificar qué usará el sistema en los cálculos de tardanza.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/employees/{id}/current-schedule` — CurrentScheduleController
- [ ] 🔧 Returns current schedule + its 7 ScheduleDays; 404 if no active schedule exists
- [ ] 🧪 Feature tests: has current schedule, no schedule (404)

## ✅ Frontend Tasks

- [ ] 📂 Create **Schedules tab** inside Employee Detail page
- [ ] 📝 Add `getCurrentSchedule(employeeId)` to `src/services/schedule.service.ts`
- [ ] 🔧 `useCurrentSchedule(employeeId)` hook — TanStack Query fetch
- [ ] 📱 **Current Schedule panel** — read-only 7-row table: day, expected_start, expected_lunch_end, expected_end, is_day_off indicator
- [ ] 📱 **Empty state** — "Sin horario activo" with "Crear horario" CTA button linking to #053
- [ ] 📱 **Workday info** — workday_type badge, working_days_per_week, effective_from date, name

---

## 🎯 Acceptance Criteria

- [ ] Schedule tab shows the 7-day grid with all times
- [ ] Empty state visible with CTA when no schedule exists
- [ ] 404 from API maps to empty state (not an error screen)

---

## 🔗 References

- **Backlog:** AP-009 · RF-08

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`
