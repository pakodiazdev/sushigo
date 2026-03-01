# 🔒 Task #085: Attendance Edit Permissions (Manager vs Admin)

## 📖 Story

**English:**
As a system, I want to enforce that Managers can only edit attendance for the current day while Admins can edit any past day with a mandatory justification, so data integrity and accountability are maintained.

**Español:**
Como sistema, quiero que los Managers solo puedan editar la asistencia del día actual mientras que los Admins puedan editar cualquier día pasado con una justificación obligatoria, para mantener la integridad y trazabilidad de los datos.

---

## ✅ Backend Tasks

- [ ] 🔧 `AttendancePolicy` or middleware: if user is Manager and `attendance.date ≠ today` → 403
- [ ] 🔧 Apply restriction to: check-in, lunch-return, check-out, day-status, overtime-decision, partial-leave endpoints
- [ ] 🔧 For Admin: when `attendance.date < today`, request requires `reason` field; stored in audit log
- [ ] 🧪 Feature tests: Manager edits today → OK; Manager edits yesterday → 403; Admin edits yesterday without reason → 422; Admin edits yesterday with reason → OK + audit log entry

## ✅ Frontend Tasks

- [ ] 📱 **Edit controls in Today view** — hide action buttons (check-in, mark day, partial leave, overtime decision) for past-day records when user is Manager
- [ ] 📱 **Admin historical edit indicator** — when Admin edits a past-day record, show a "Motivo de edición" required text field before submitting any attendance action
- [ ] 🔧 `useAttendancePermissions(date, userRole)` helper hook — returns `canEdit: boolean`, `requiresReason: boolean`
- [ ] 📱 Past-day rows in Today view / reports show a lock icon for Managers; an edit icon for Admins

---

## 🎯 Acceptance Criteria

- [ ] Manager sees no edit controls for yesterday's attendance rows
- [ ] Admin can edit any day; form asks for a reason when the date is in the past
- [ ] 403 from API maps to "No tienes permiso para editar registros históricos"

---

## 🔗 References

- **Backlog:** AP-066, AP-067 · RF-17, RF-18, RF-19

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`
