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
