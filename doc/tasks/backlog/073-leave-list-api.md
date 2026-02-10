# 🌐 Task #073: List Leaves API

## 📖 Story

**English:**
As a Manager, I want to query leaves for an employee.

**Español:**
Como Manager, quiero consultar los permisos de un empleado.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/leaves?employee_id=&status=&date_from=&date_to=` — ListLeavesController
- [ ] 🔧 Includes leave type name, dates, status, approved_by
- [ ] 🧪 Feature test

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Leave History** (in Employee Detail or Leave Management page) — table: dates (from–to), type, status badge, days count, approved/rejected by; status filter + date range filter; pagination
- [ ] 📱 **Cancel Action** — for PENDING leaves, show cancel button
- [ ] 📱 Hook: `useLeaveHistory(employeeId, status, dateRange)` — query with pagination
- [ ] 🧪 E2E test: filter by status, verify pagination

---

## 🎯 Acceptance Criteria

- [ ] Filters and pagination work

---

## 🔗 References

- **Backlog:** AP-051
- RF-25
- domain-model.md §2.12

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
