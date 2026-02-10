# 🍽️ Task #027: Register Lunch Return API

## 📖 Story

**English:**
As a Manager, I want to register the lunch return time, to calculate lunch lateness.

**Español:**
Como Manager, quiero registrar la hora de regreso de comida, para calcular tardanza en el regreso.

---

## ✅ Technical Tasks

- [ ] 🌐 `PATCH /api/v1/attendances/{id}/lunch-return` — RegisterLunchReturnController
- [ ] 📝 LunchReturnRequest — lunch_end (required, datetime)
- [ ] 🔧 Calculate lunch_late_seconds = max(0, lunch_end − expected_lunch_end) from schedule
- [ ] 🔧 Return 422 if no check_in registered, or if lunch_end already set
- [ ] 🧪 Feature tests: on-time return, late <30min, late >30min, no check_in (422), duplicate (422)

---

## 🎯 Acceptance Criteria

- [ ] lunch_late_seconds calculated
- [ ] Requires existing check_in

---

## 🔗 References

- **Backlog:** AP-014
- RF-14, RF-15a
- domain-model.md §2.7

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `3h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
