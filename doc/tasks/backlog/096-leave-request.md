# 📝 Task #096: Leave Request — Prior Solicitud + Approve/Reject

## 📖 Story

**English:**
As an employee (via manager), I want to submit a leave request in advance so that the manager can review, approve, or reject it. On approval, attendance records are automatically created and check-in is blocked for those days.

**Español:**
Como empleado (a través del manager), quiero solicitar una ausencia con anticipación para que el manager pueda revisarla, aprobarla o rechazarla. Al aprobar, los registros de asistencia se crean automáticamente y el check-in queda bloqueado para esos días.

---

## 🧠 Key Design Decisions

- Extends the `leaves` table (already created in #077). Only adds the PENDING → APPROVED/REJECTED flow.
- Direct registration (#077) skips PENDING and goes straight to APPROVED.
- Solicitud registration (this task) creates the leave with `status = PENDING`, awaiting approval.
- On approval: creates Attendance records with `day_status = LEAVE` for each date in range.
- On rejection: no attendance impact. Status = REJECTED.
- Approve/Reject buttons appear only on PENDING rows in the Employee Detail leaves tab (#078).

---

## ✅ Backend Tasks

- [ ] 🌐 `POST /api/v1/leave-requests` — `RegisterLeaveRequestController`
  - Same fields as direct registration but `status = PENDING`, `approved_by = null`
  - Does NOT create Attendance records yet
- [ ] 🌐 `PATCH /api/v1/leaves/{id}/approve` — `ApproveLeaveController`
  - Sets `status = APPROVED`, `approved_by`, `approved_at`
  - Creates/updates Attendance records for each date in range with `day_status = LEAVE`
  - Validates leave is currently PENDING
- [ ] 🌐 `PATCH /api/v1/leaves/{id}/reject` — `RejectLeaveController`
  - Sets `status = REJECTED`, `approved_by`, `approved_at`
  - No attendance impact
- [ ] 🧪 Feature tests:
  - Submit request → status PENDING, no attendance records
  - Approve request → status APPROVED, attendance records created with LEAVE status
  - Reject request → status REJECTED, no attendance records
  - Cannot approve an already APPROVED leave
  - Check-in blocked after approval
  - Unauthorized access (401/403)

---

## ✅ Frontend Tasks

- [ ] 🔧 `registerLeaveRequest(data)` + `approveLeave(id)` + `rejectLeave(id)` in `src/services/leave.service.ts`
- [ ] 📱 **"Solicitar permiso" button** in the Ausencias tab (#078) — opens the same form but submits as PENDING
  - Form shows a "solicitud" indicator vs "registro directo"
- [ ] 📱 **Approve / Reject buttons** on PENDING rows in the Ausencias table (#078)
  - Approve: confirmation dialog — "¿Aprobar ausencia del [fecha] al [fecha]? Se crearán los registros de asistencia."
  - Reject: confirmation dialog with optional rejection note
- [ ] 📱 After approve: row status badge → APPROVED; Today view shows LEAVE badge on affected days
- [ ] 📱 After reject: row status badge → REJECTED; no attendance change
- [ ] 🔧 `useLeaveActions(employeeId)` hook — owns approve/reject mutations and optimistic updates

---

## 🧪 Tests

- [ ] ✅ PHPUnit: all backend feature tests listed above
- [ ] ✅ Vitest: `useLeaveActions` — approve mutation triggers attendance refetch; reject mutation updates row status
- [ ] 🌲 Cypress E2E (happy path): Ausencias tab → "Solicitar permiso" → fill form → submit → row shows PENDING → click Approve → row shows APPROVED → Today view shows LEAVE badge

---

## 🎯 Acceptance Criteria

- [ ] Solicitud creates a PENDING leave — no attendance impact yet
- [ ] Approving creates LEAVE attendance records for all dates in range
- [ ] Rejecting shows REJECTED status without touching attendance
- [ ] Approve/Reject buttons visible only on PENDING rows
- [ ] Check-in attempt on an approved leave day returns a clear 422 error

---

## 🔗 References

- **Backlog:** AP-050 · RF-25, RF-28
- **Depends on:** #077 (leave foundation), #078 (employee leaves tab)

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
