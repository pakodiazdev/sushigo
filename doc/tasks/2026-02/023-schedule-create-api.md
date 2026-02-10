# 🌐 Task #023: Create Schedule API (with 7 days)

## 📖 Story

**English:**
As an Admin, I want to create a complete schedule for an employee (7 days in one request), to define their expected start/lunch/end times.

**Español:**
Como Admin, quiero crear un horario completo para un empleado (7 días en una petición), para definir sus tiempos esperados.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/employment-periods/{id}/schedules` — CreateScheduleController
- [ ] 📝 StoreScheduleRequest — name, effective_from, workday_type, working_days_per_week, days[] (array of 7: day_of_week, is_day_off, expected_start, expected_lunch_end, expected_end)
- [ ] 🔧 Validation: if is_day_off = false → expected_start required; days must cover all 7 day_of_week values
- [ ] 🔧 On create: auto-close previous schedule (effective_to = new.effective_from − 1 day)
- [ ] 🔧 Wrap in DB transaction (schedule + 7 days)
- [ ] 🧪 Feature tests: create full schedule, auto-close previous, validation (missing start for non-day-off), duplicate day_of_week rejected

---

## 🎯 Acceptance Criteria

- [ ] 7 ScheduleDay records created in one request
- [ ] Previous schedule auto-closed
- [ ] Validation rejects incomplete days

---

## 🔗 References

- **Backlog:** AP-008
- RF-08, RF-09
- domain-model.md §2.3, §2.4

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h`
- **Pessimistic:** `5h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
