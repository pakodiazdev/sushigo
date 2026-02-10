# 🚪 Task #028: Register Check-out API

## 📖 Story

**English:**
As a Manager, I want to register the departure time, so the system calculates worked hours and overtime.

**Español:**
Como Manager, quiero registrar la hora de salida, para que el sistema calcule horas trabajadas y overtime.

---

## ✅ Technical Tasks

- [ ] 🌐 `PATCH /api/v1/attendances/{id}/check-out` — RegisterCheckOutController
- [ ] 📝 CheckOutRequest — check_out (required, datetime)
- [ ] 🔧 Calculate net_worked_minutes = (check_out − check_in) − lunch_duration_if_applicable
- [ ] 🔧 Calculate overtime_minutes = max(0, check_out − expected_end) in minutes
- [ ] 🔧 Return 422 if no check_in registered
- [ ] 🔧 Response includes: net_worked_minutes, overtime_minutes, requires_overtime_decision (true if overtime_minutes > 0)
- [ ] 🧪 Feature tests: normal checkout (no overtime), checkout with overtime, no check_in (422)

---

## 🎯 Acceptance Criteria

- [ ] net_worked_minutes calculated correctly
- [ ] overtime_minutes detected
- [ ] Response signals if overtime decision needed

---

## 🔗 References

- **Backlog:** AP-015
- RF-12, RF-14, RF-42
- domain-model.md §2.7, sequence §6.2

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
