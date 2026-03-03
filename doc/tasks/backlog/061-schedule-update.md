# ✏️ Task #061: Modify Permanent Schedule (Full Replacement)

## 📖 Story

**English:**
As an Admin, I want to permanently change an employee's weekly schedule (replacing it with a new base version), so the new times apply indefinitely from a chosen date until the end of the employment period.

**Español:**
Como Admin, quiero modificar de forma permanente el horario semanal de un empleado (reemplazándolo con una nueva versión base), para que los nuevos horarios apliquen indefinidamente a partir de una fecha elegida hasta el fin del período laboral.

> **Scope clarification:** This task covers replacing the complete 7-day base schedule.
> For temporary day-by-day exceptions (e.g., "this Monday I'll arrive at 3pm"), see task #088 (Schedule Day Overrides).

---

## ✅ Backend Tasks

- [ ] 🌐 `PUT /api/v1/employment-periods/{period}/schedules/current` — replaces the active schedule
- [ ] 📝 Request — same fields as create (name, effective_from, workday_type, working_days_per_week, days[])
- [ ] 🔧 Reuses `CreateScheduleAction` — automatically closes the previous schedule
- [ ] 🧪 Feature tests: replace active schedule, verify old schedule is closed

## ✅ Frontend Tasks

- [ ] 📱 **"Modificar horario"** button in ScheduleDialog (from #056) → opens the `new.tsx` form pre-filled
- [ ] 📝 Reuse `scheduleApi.create()` — no new endpoint needed, same flow as #053
- [ ] 🔧 After save, redirect back to employee detail slide

---

## 🎯 Acceptance Criteria

- [ ] Admin can open a pre-filled 7-day form and save a new base schedule
- [ ] Previous schedule is automatically closed (effective_to = new.effective_from − 1 day)
- [ ] New schedule appears immediately in the dialog

---

## 🔗 References

- **Backlog:** AP-011 · RF-08

---

## ⏱️ Estimates

- **Optimistic:** `30min` · **Pessimistic:** `1h`
