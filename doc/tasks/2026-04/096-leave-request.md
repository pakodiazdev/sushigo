# 📝 Task #096: Leave Request — Solicitud Anticipada + Express + Aprobar/Rechazar

## 📖 Story

**English:**
As an employee (submitted by manager on their behalf), I want to submit a leave request in advance so the manager can approve or reject it. For same-day situations (employee calls in late or needs to leave early), the manager uses an express approval flow. On approval, attendance records are automatically set and the Today view reflects the leave context.

**Español:**
Como empleado (registrado por el manager en su nombre), quiero solicitar un permiso con anticipación para que el manager pueda aprobarlo o rechazarlo. Para situaciones del mismo día (el empleado avisa tarde o necesita salir temprano), el manager usa un flujo de aprobación exprés. Al aprobar, los registros de asistencia se ajustan y la vista de Hoy refleja el contexto del permiso.

---

## 🧠 Key Design Decisions

- All leaves (full-day, partial, anticipated, express) use the **same `leaves` table** created in #077. No new tables.
- **`calculation_mode = FIXED_PERCENTAGE`**: full-day leave. `affected_hours = null`. Paid 100% or 0% based on `is_paid`.
- **`calculation_mode = PROPORTIONAL_HOURS`**: partial-day leave. `affected_hours` required. Payroll deduction proportional to hours.
- **Anticipated flow**: manager creates leave with `status = PENDING`, awaiting their own (or another manager's) approval. Useful for formal requests entered in advance.
- **Express flow**: manager creates leave directly with `status = APPROVED` (same as direct registration in #077, but may be for a partial/today scenario). No PENDING step required.
- **Self-service (future)**: employee-initiated requests are architecturally the same — `status = PENDING`, `submitted_by = employee_id`. Not scoped here but the data model supports it.
- On approval: for `OPEN_ENDED` leaves, creates Attendance records with `day_status = LEAVE` for each calendar day in range. For `SCHEDULED` partial leaves, no attendance record is created — the leave is read by CloseDayAction and Today view.
- On rejection: `status = REJECTED`, no attendance impact.
- Approve/Reject buttons appear only on PENDING rows in the Employee Leaves tab (#078).
- Express partial leaves (same-day, `calculation_mode = PROPORTIONAL_HOURS`): manager opens the "Registrar permiso" form from the Employee Detail leaves tab, fills in times, and approves immediately. The Today view (via #098) picks up the approved leave and shows the context chip on the card.

---

## ✅ Backend Tasks

- [ ] 🌐 `POST /api/v1/leaves` (already in #077) — add support for `status = PENDING` when `submit_as_request = true` flag is passed
  - If `submit_as_request = true`: creates leave with `status = PENDING`, `approved_by = null`
  - If `submit_as_request = false` (default): creates with `status = APPROVED` (existing behavior)
  - Does NOT create Attendance records when `status = PENDING`
- [ ] 🌐 `PATCH /api/v1/leaves/{id}/approve` — `ApproveLeaveController`
  - Sets `status = APPROVED`, `approved_by`, `approved_at`
  - For `OPEN_ENDED` leaves: creates Attendance records with `day_status = LEAVE` for each date in range
  - For `SCHEDULED` leaves: no attendance records created (leave context surfaced at runtime by #098 and CloseDayAction)
  - Validates leave is currently `PENDING`; returns 422 if already APPROVED/REJECTED
- [ ] 🌐 `PATCH /api/v1/leaves/{id}/reject` — `RejectLeaveController`
  - Sets `status = REJECTED`, `approved_by`, `approved_at`, optional `rejection_note`
  - No attendance impact
  - Validates leave is currently `PENDING`
- [ ] 🔧 Update `CloseDayAction` (done in #055) to handle SCHEDULED approved partial leaves:
  - If `time_mode = SCHEDULED` and employee worked but departed early per leave: leave overtime/early-out calculation to the payroll module (#072+)
  - If `time_mode = SCHEDULED` and employee never checked in: same priority as full-day LEAVE (mark LEAVE, not ABSENCE)
- [ ] 🧪 PHPUnit feature tests:
  - Submit with `submit_as_request = true` → status PENDING, no attendance records created
  - Submit with default → status APPROVED (regression, #077 behavior)
  - Approve OPEN_ENDED request → status APPROVED, Attendance records with LEAVE created for each date
  - Approve SCHEDULED partial → status APPROVED, no Attendance records created
  - Reject request → status REJECTED, no attendance impact
  - Cannot approve already APPROVED leave (422)
  - Cannot reject already REJECTED leave (422)
  - Unauthorized access (401/403)

---

## ✅ Frontend Tasks

- [ ] 🔧 Add `approveLeave(id)` + `rejectLeave(id)` to `src/services/leave-api.ts` (or equivalent leave service)
- [ ] 🔧 Update `RegisterLeaveForm` (from #077/#078) to expose a "Guardar como solicitud" toggle — when on, sends `submit_as_request: true`; hidden by default (default = direct registration)
- [ ] 📱 **Approve / Reject buttons** on PENDING rows in Employee Detail → Leaves tab (#078):
  - Approve: `AlertDialog` confirmation — "¿Aprobar permiso del [fecha] al [fecha]?" — Aprobar / Cancelar
  - Reject: `AlertDialog` with optional `rejection_note` text input — Rechazar / Cancelar
- [ ] 📱 After approve: row status badge → APPROVED (green); if OPEN_ENDED, Today view shows LEAVE badge on affected days via #098
- [ ] 📱 After reject: row status badge → REJECTED (muted red); no attendance change
- [ ] 🔧 `useLeaveActions(employeeId)` hook — owns approve/reject mutations, invalidates leaves list + today attendance queries on success

---

## 🧪 Tests

- [ ] ✅ PHPUnit: all backend feature tests listed above
- [ ] ✅ Vitest: `useLeaveActions` — approve mutation invalidates `['attendances', 'today']` and `['leaves', employeeId]`; reject mutation updates row status without touching attendance cache
- [ ] 🌲 Cypress E2E (anticipated flow happy path):
  - Employee Detail → Ausencias tab → "Registrar permiso" → toggle "Guardar como solicitud" → submit → row shows PENDING badge
  - Click Approve on PENDING row → confirm dialog → row shows APPROVED badge
- [ ] 🌲 Cypress E2E (express partial happy path):
  - Employee Detail → Ausencias tab → "Registrar permiso" → fill times (PROPORTIONAL_HOURS) → submit (no PENDING toggle) → Today view card shows leave context chip (#098)

---

## 🎯 Acceptance Criteria

- [ ] "Guardar como solicitud" toggle creates a PENDING leave without attendance impact
- [ ] Approve button visible only on PENDING rows; clicking creates LEAVE attendance records (OPEN_ENDED only)
- [ ] Reject button visible only on PENDING rows; clicking changes status to REJECTED only
- [ ] Express partial leave (PROPORTIONAL_HOURS, APPROVED directly) surfaces as leave context chip in Today view
- [ ] Cannot approve an already approved leave (UI hides button + API returns 422)
- [ ] All actions show clear success/error toasts

---

## 🔗 References

- **Backlog:** AP-050 · RF-25, RF-28
- **Depends on:** #077 (leave foundation), #078 (employee leaves tab), #055 (CloseDayAction fix), #098 (Today view leave context)

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
