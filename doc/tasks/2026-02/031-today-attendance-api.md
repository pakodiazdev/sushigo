# 📋 Task #031: Today Attendance View API

## 📖 Story

**English:**
As a Manager, I want to see all employees with their attendance status for today, to operate daily capture.

**Español:**
Como Manager, quiero ver la lista de empleados con su estado de asistencia del día, para operar la captura diaria.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/attendances/today?branch_id=` — TodayAttendanceController
- [ ] 🔧 Query active employees for the branch (via active employment period) → LEFT JOIN attendances for today
- [ ] 🔧 Response per employee: { employee: {id, code, name, role}, attendance: {check_in, check_out, lunch_end, day_status, entry_late_seconds, overtime_minutes} | null }
- [ ] 🔧 Employees without attendance appear with null (not yet registered)
- [ ] 🔧 Order by employee name
- [ ] 🧪 Feature tests: branch with mixed attendance (some checked in, some not), empty branch

---

## 🎯 Acceptance Criteria

- [ ] All active employees shown
- [ ] Employees without attendance show null
- [ ] Filtered by branch

---

## 🔗 References

- **Backlog:** AP-018
- RF-48
- domain-model.md §2.7

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h`
- **Pessimistic:** `4h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
