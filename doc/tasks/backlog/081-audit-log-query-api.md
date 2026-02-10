# 🌐 Task #081: Audit Log Query API

## 📖 Story

**English:**
As an Admin, I want to query the audit trail for attendance records.

**Español:**
Como Admin, quiero consultar el historial de auditoría de registros de asistencia.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/audit-logs?auditable_type=&auditable_id=` — by record
- [ ] 🌐 `GET /api/v1/audit-logs?employee_id=&date_from=&date_to=` — by employee/range
- [ ] 🔧 Includes: action, old/new values, user name, timestamp, reason
- [ ] 🔧 Pagination
- [ ] 🧪 Feature tests

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Audit Log Page** (Admin only) — route: `/admin/audit-log`; table: timestamp, user, action (CREATE/UPDATE/DELETE), record type, record ID, changes (JSON diff); filters: employee, date range, action type; pagination
- [ ] 📱 **Changes Diff View** — expand row to see old vs new values (highlighted diff)
- [ ] 📱 **Context Link** — click record ID to navigate to the affected attendance/employee
- [ ] 📱 Hooks: `useAuditLog(filters)` — query with pagination
- [ ] 🧪 E2E test: view audit log, filter by employee, expand to see diff

---

## 🎯 Acceptance Criteria

- [ ] Both query modes work
- [ ] Pagination works

---

## 🔗 References

- **Backlog:** AP-068
- RF-19, RF-50
- domain-model.md §2.23

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
