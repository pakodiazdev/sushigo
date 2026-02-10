# 📊 Task #056: Today Report API (operational view)

## 📖 Story

**English:**
As a Manager, I want a consolidated daily report showing each employee's status, for daily operations.

**Español:**
Como Manager, quiero un reporte consolidado del día mostrando el estado de cada empleado.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/reports/today?branch_id=` — TodayReportController
- [ ] 🔧 Per employee: name, code, role, status (arrived|not_arrived|late|day_off|on_leave), check_in_time, late_minutes, has_overtime
- [ ] 🔧 Totals: total_employees, arrived_count, not_arrived_count, late_count
- [ ] 🧪 Feature tests: mixed status employees, all arrived, none arrived

---

## 🎯 Acceptance Criteria

- [ ] Summary totals correct
- [ ] Each employee categorized correctly

---

## 🔗 References

- **Backlog:** AP-059
- RF-48
- backlog AP-059

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
