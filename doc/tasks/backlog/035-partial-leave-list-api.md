# 📋 Task #035: List Partial Leaves API

## 📖 Story

**English:**
As a Manager, I want to query partial leaves for an employee in a date range.

**Español:**
Como Manager, quiero consultar los permisos parciales de un empleado en un rango de fechas.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/partial-leaves?employee_id=&date_from=&date_to=` — ListPartialLeavesController
- [ ] 🔧 Paginated response with: type, is_paid, duration_minutes, reason, approved_by (name)
- [ ] 🧪 Feature tests: filter by employee, filter by date range, pagination

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Partial Leaves Table** (in Employee Detail or standalone) — columns: date, type, paid/unpaid badge, duration, reason, approved_by; date range filter; pagination
- [ ] 📱 **Export** — optional CSV download for selected range
- [ ] 📱 Hook: `usePartialLeaves(employeeId, dateRange)` — query with pagination
- [ ] 🧪 E2E test: filter by date range, verify pagination

---

## 🎯 Acceptance Criteria

- [ ] Filters work correctly
- [ ] Pagination works

---

## 🔗 References

- **Backlog:** AP-022
- RF-25a
- domain-model.md §2.8

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
