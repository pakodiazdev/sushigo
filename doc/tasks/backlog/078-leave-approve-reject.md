# ✔️ Task #078: Approve or Reject a Leave

## 📖 Story

**English:**
As a Manager, I want to approve or reject a pending leave so that, on approval, the affected attendance days are automatically updated to LEAVE status and the employee cannot be checked in on those days.

**Español:**
Como Manager, quiero aprobar o rechazar una ausencia pendiente para que, al aprobar, los días de asistencia afectados se actualicen automáticamente al estado AUSENCIA y el empleado no pueda registrar entrada esos días.

---

## ✅ Backend Tasks

- [ ] 🌐 `PATCH /api/v1/leaves/{id}/approve` — ApproveLeaveController; sets status=APPROVED, approved_by, approved_at; creates/updates Attendance records for each day in range with day_status=LEAVE
- [ ] 🌐 `PATCH /api/v1/leaves/{id}/reject` — RejectLeaveController; sets status=REJECTED
- [ ] 🔧 On check-in (existing endpoint): if an approved leave exists for that date → 422 "El empleado tiene una ausencia aprobada para este día"
- [ ] 🧪 Feature tests: approve (attendance records created), reject, check-in blocked on leave day

## ✅ Frontend Tasks

- [ ] 🔧 `approveLeave(leaveId)` + `rejectLeave(leaveId)` in `src/services/leave.service.ts`
- [ ] 📱 **Approve / Reject action buttons** on each PENDING row in the leave list (#079)
- [ ] 📱 Confirmation dialog for approve: "¿Aprobar ausencia del [fecha] al [fecha]? Se bloquearán los registros de asistencia."
- [ ] 📱 After approve: status badge updates to APPROVED; attendance rows for those days show LEAVE badge in Today view

---

## 🎯 Acceptance Criteria

- [ ] Approving a leave creates LEAVE attendance records for all affected days
- [ ] Attempting to check in an employee on an approved leave day shows a clear error
- [ ] Rejected leaves show REJECTED status; no attendance records are created

---

## 🔗 References

- **Backlog:** AP-050 (partial) · RF-25, RF-28

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`
