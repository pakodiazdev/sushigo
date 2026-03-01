# 📋 Task #079: View Leave History

## 📖 Story

**English:**
As a Manager, I want to query an employee's leave history with filters by status and date range, so I can review all absences and their approval state.

**Español:**
Como Manager, quiero consultar el historial de ausencias de un empleado con filtros por estado y rango de fechas, para revisar todas las ausencias y su estado de aprobación.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/leaves?employee_id=&status=&date_from=&date_to=` — ListLeavesController
- [ ] 🔧 Response: leave_type (name, is_paid), start_date, end_date, status, requested_by (name), approved_by (name)
- [ ] 🔧 Pagination
- [ ] 🧪 Feature tests: filter by employee, by status, by date range

## ✅ Frontend Tasks

- [ ] 📝 Add `getLeaves(filters)` to `src/services/leave.service.ts`
- [ ] 📱 **Leaves tab** in Employee Detail — table: date range, leave type badge (with paid/unpaid indicator), status badge, approved by
- [ ] 📱 Status filter and date range filter above the table
- [ ] 📱 Approve/Reject buttons on PENDING rows (from #078)
- [ ] 🔧 `useLeaveList(employeeId)` hook

---

## 🎯 Acceptance Criteria

- [ ] All leave types and statuses are filterable
- [ ] Paid and unpaid types are visually distinguishable
- [ ] PENDING rows show action buttons; APPROVED/REJECTED rows are read-only

---

## 🔗 References

- **Backlog:** AP-051 · RF-25

---

## ⏱️ Estimates

- **Optimistic:** `1h` · **Pessimistic:** `2h`
