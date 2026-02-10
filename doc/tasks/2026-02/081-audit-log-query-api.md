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
