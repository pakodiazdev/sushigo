# 📋 Task #058: View Partial Leave History

## 📖 Story

**English:**
As a Manager, I want to query an employee's partial leaves within a date range, so I can review their history and verify what has been deducted.

**Español:**
Como Manager, quiero consultar los permisos parciales de un empleado dentro de un rango de fechas, para revisar su historial y verificar qué se ha descontado.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/partial-leaves?employee_id=&date_from=&date_to=` — ListPartialLeavesController
- [ ] 🔧 Response includes: type, is_paid, duration_minutes, reason, approved_by (name), date
- [ ] 🔧 Pagination
- [ ] 🧪 Feature tests: filter by employee, filter by date range, pagination

## ✅ Frontend Tasks

- [ ] 📝 Add `getPartialLeaves(filters)` to `src/services/partial-leave.service.ts`
- [ ] 📱 **Partial leaves panel** in Employee Detail (new "Permisos" tab or section) — table with columns: date, type badge, duration, paid/unpaid badge, reason, approved by
- [ ] 📱 Date range filter inputs above the table
- [ ] 🔧 `usePartialLeaveHistory(employeeId)` hook — query with filter state

---

## 🎯 Acceptance Criteria

- [ ] Manager can filter partial leaves by date range
- [ ] Each row shows whether the leave was paid or unpaid
- [ ] Empty state message when no results

---

## 🔗 References

- **Backlog:** AP-022 · RF-25a

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`
