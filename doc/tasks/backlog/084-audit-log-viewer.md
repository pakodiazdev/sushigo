# 🔍 Task #084: View Attendance Audit Log

## 📖 Story

**English:**
As an Admin, I want to query the change history of an attendance record or employee, so I can audit all modifications with before/after values, the user who made the change, and their justification.

**Español:**
Como Admin, quiero consultar el historial de cambios de un registro de asistencia o empleado, para auditar todas las modificaciones con valores antes/después, el usuario que hizo el cambio y su justificación.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/audit-logs?auditable_type=&auditable_id=` — list changes for a specific record
- [ ] 🌐 `GET /api/v1/audit-logs?employee_id=&date_from=&date_to=` — changes by employee and date range
- [ ] 🔧 Response: action (CREATE|UPDATE|DELETE), old_values, new_values (diff only), user (name), created_at, reason (nullable)
- [ ] 🔧 Pagination
- [ ] 🧪 Feature tests: filter by record, filter by employee/range

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/audit.tsx`
- [ ] 📝 Add `AttendanceAuditLog`, `AuditAction` types to `src/types/attendance-payroll.ts`
- [ ] 🔧 `getAuditLogs(filters)` in `src/services/audit.service.ts`
- [ ] 📱 **Audit log panel** — accessible from: attendance record detail (shows changes for that record) + Employee Detail → "Auditoría" tab (shows all changes for the employee)
- [ ] 📱 Table columns: date/time, action badge (CREATE/UPDATE/DELETE), user, changed fields (before → after), reason
- [ ] 📱 "Changed fields" renders as a diff: `check_in: 08:15 → 08:05 (reason: Corrección de horario)`
- [ ] 🔧 `useAuditLog(filters)` hook

---

## 🎯 Acceptance Criteria

- [ ] Admin can see all changes made to an attendance record with timestamps and users
- [ ] Diff shows only the modified fields (not the entire record)
- [ ] reason field is shown when present (Admin historical edits from #085)

---

## 🔗 References

- **Backlog:** AP-065, AP-068 · RF-19, RF-50

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`
