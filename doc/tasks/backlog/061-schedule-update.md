# ✏️ Task #061: Update Current Schedule

## 📖 Story

**English:**
As an Admin, I want to update the times and settings of the current active schedule, so I can correct mistakes without creating a new schedule entry.

**Español:**
Como Admin, quiero actualizar los tiempos y configuración del horario activo actual, para corregir errores sin crear un nuevo registro de horario.

---

## ✅ Backend Tasks

- [ ] 🌐 `PUT /api/v1/schedules/{id}` — UpdateScheduleController
- [ ] 📝 UpdateScheduleRequest — same fields as create (name, workday_type, working_days_per_week, days[])
- [ ] 🔧 Only allows updating if `effective_to IS NULL` (schedule is currently active); 422 if closed
- [ ] 🧪 Feature tests: update active schedule, reject update on closed schedule

## ✅ Frontend Tasks

- [ ] 📱 **Edit button** on Current Schedule panel (from #056) — opens inline edit form (same 7-day grid, pre-filled)
- [ ] 📝 Add `updateSchedule(scheduleId, data)` to `src/services/schedule.service.ts`
- [ ] 🔧 `useUpdateSchedule(scheduleId)` hook — mutation, on success refreshes schedule panel
- [ ] 📱 Reuse the 7-day grid component from #053 in edit mode

---

## 🎯 Acceptance Criteria

- [ ] Admin can edit times on the current schedule and save
- [ ] Form pre-fills with existing values
- [ ] Closed schedules (in history) do not show the edit button

---

## 🔗 References

- **Backlog:** AP-011 · RF-08

---

## ⏱️ Estimates

- **Optimistic:** `1h` · **Pessimistic:** `2h`
