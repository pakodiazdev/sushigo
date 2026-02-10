# 🌐 Task #072: Update Current Schedule API

## 📖 Story

**English:**
As an Admin, I want to update a current schedule's times without creating a new one.

**Español:**
Como Admin, quiero actualizar los tiempos de un horario vigente sin crear uno nuevo.

---

## ✅ Technical Tasks

- [ ] 🌐 `PUT /api/v1/schedules/{id}` — UpdateScheduleController (name, workday_type, working_days_per_week, days[])
- [ ] 🔧 Only editable if effective_to IS NULL
- [ ] 🔧 Return 422 if schedule is closed (has effective_to)
- [ ] 🧪 Feature tests: update current, attempt closed (422)

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Edit Schedule Button** — on current (open) schedule card, opens edit form
- [ ] 📱 **Edit Schedule Form** — same 7-day grid as create (#023) but pre-filled with current values; only editable if effective_to is null
- [ ] 📱 **Disabled State** — if schedule is closed (effective_to set), show edit button as disabled with tooltip
- [ ] 📱 Hook: `useUpdateSchedule(scheduleId)` — mutation
- [ ] 🧪 E2E test: edit current schedule times, verify saved; attempt edit on closed schedule, verify blocked

---

## 🎯 Acceptance Criteria

- [ ] Only current schedule editable
- [ ] Closed schedule rejected

---

## 🔗 References

- **Backlog:** AP-011
- RF-08
- domain-model.md §2.3

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `1.5h`
- **Pessimistic:** `2.5h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
