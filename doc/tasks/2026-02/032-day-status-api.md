# 📝 Task #032: Set Day Status API (day-off / absence)

## 📖 Story

**English:**
As a Manager, I want to mark a day as day-off or absence for an employee, without check-in/out.

**Español:**
Como Manager, quiero marcar un día como descanso o falta para un empleado, sin check-in/out.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/attendances/day-status` — SetDayStatusController
- [ ] 📝 DayStatusRequest — employee_id (required), date (required), day_status (required, in: DAY_OFF, ABSENCE)
- [ ] 🔧 Creates Attendance record with only day_status (no check_in/out)
- [ ] 🔧 Return 422 if attendance already exists for that date
- [ ] 🧪 Feature tests: mark day off, mark absence, duplicate date (422)

---

## 🎯 Acceptance Criteria

- [ ] Attendance created without timestamps
- [ ] Duplicate rejected

---

## 🔗 References

- **Backlog:** AP-019
- RF-16
- domain-model.md §2.7

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
