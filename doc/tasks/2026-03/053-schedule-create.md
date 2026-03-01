# 📅 Task #053: Create Weekly Schedule

## 📖 Story

**English:**
As an Admin, I want to create a complete 7-day schedule for an employee, so the system knows the expected check-in, lunch-return, and check-out times used to calculate tardiness.

**Español:**
Como Admin, quiero crear un horario semanal completo de 7 días para un empleado, para que el sistema conozca los tiempos esperados de entrada, regreso de almuerzo y salida usados en el cálculo de tardanzas.

---

## ✅ Backend Tasks

- [ ] 🌐 `POST /api/v1/employment-periods/{id}/schedules` — CreateScheduleController
- [ ] 📝 StoreScheduleRequest — name, effective_from, workday_type, working_days_per_week, days[] (day_of_week, is_day_off, expected_start, expected_lunch_end, expected_end)
- [ ] 🔧 Validation: `is_day_off = false` → `expected_start` required; all 7 day_of_week values required; no duplicates
- [ ] 🔧 On create: auto-close previous schedule (`effective_to = new.effective_from − 1 day`)
- [ ] 🔧 Wrap schedule + 7 ScheduleDays in DB transaction
- [ ] 🧪 Feature tests: happy path, auto-close previous, missing start time, duplicate day_of_week

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/employees/$employeeId/schedules/new.tsx`
- [ ] 📝 Add `EmployeeSchedule`, `ScheduleDay`, `WorkdayType` types to `src/types/attendance-payroll.ts`
- [ ] 🔧 `createSchedule(periodId, data)` in `src/services/schedule.service.ts`
- [ ] 📱 **Create Schedule form** — header fields: name, effective_from, workday_type, working_days_per_week; 7-row day grid (react-hook-form + zod)
- [ ] 📱 **Day grid row** — day label, is_day_off toggle, expected_start (time), expected_lunch_end (time), expected_end (time); time inputs disabled when day-off
- [ ] 📱 **Auto-close warning banner** — "El horario anterior se cerrará al guardar"
- [ ] 🔧 `useCreateSchedule(periodId)` hook — mutation, on success redirect to employee schedules tab
- [ ] 🧪 Form validation: required start time when day not marked as off

---

## 🎯 Acceptance Criteria

- [ ] Admin submits the form and 7 ScheduleDay records are created in one request
- [ ] If a previous schedule exists, it is closed automatically; warning is visible before saving
- [ ] Validation blocks submission if a non-day-off row is missing start time

---

## 🔗 References

- **Backlog:** AP-008 · RF-08, RF-09

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
