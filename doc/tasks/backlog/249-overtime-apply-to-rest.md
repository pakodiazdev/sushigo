# ✨ Task #249: "Apply to the Rest" Checkbox for Bulk Overtime Decisions

**GitHub Issue:** [#249](https://github.com/pakodiazdev/sushigo/issues/249)

## 📖 Story

**English:**
As an Admin closing the day for a branch, when several employees show the same overtime decision (`overtime_pending`), I want to check "Aplicar para el resto" on the decision/valuation dialog so that the decision I just configured (authorize/reject, method, rate or factor) is copied and applied to every other pending employee in the queue at once — in a single request — instead of having to confirm the same dialog one employee at a time.

**Español:**
Como Admin cerrando el día de una sucursal, cuando varios empleados muestran la misma decisión de hora extra pendiente (`overtime_pending`), quiero marcar "Aplicar para el resto" en el diálogo de decisión/valoración para que la decisión que acabo de configurar (autorizar/rechazar, método, tarifa o factor) se copie y aplique de una vez al resto de empleados pendientes en la cola — en una sola petición — en vez de tener que confirmar el mismo diálogo uno por uno.

---

## 🧠 Context

#229 introduced the bulk overtime flow: `useTodayAttendancePage` (`code/webapp/src/pages/attendance/-use-today-attendance-page.ts`) queues every `overtime_pending` entry from the close-day panel into `bulkOvertimeQueue` (a FIFO array), and `AttendancePage` (`code/webapp/src/pages/attendance/index.tsx`) shows `OvertimeDecisionDialog` once per entry via `resolveOvertimeDialog` / `currentBulkOvertime`, popping the queue one at a time through `confirmBulkOvertimeDecision`. Each confirmation fires its own `overtimeDecisionMutation` call against `PATCH /api/v1/attendances/{id}/overtime-decision` (`OvertimeDecisionController` → `RecordOvertimeDecisionAction`) — there is no batch endpoint today.

When many employees end up with the same decision (e.g. everyone gets paid at the LFT-proportional rate), the admin still has to click through every dialog individually, and looping the single-decision endpoint client-side would mean N round trips. This issue adds a checkbox to skip that: capture the decision once and apply it to the rest of the queue **in one backend request**.

`RecordOvertimeDecisionAction` already locks the employee row (`lockForUpdate()`) when the method is `LFT_PROPORTIONAL`, since that method reads the employee's accumulated overtime hours for the week — the batch action must preserve that per-employee guard while processing multiple (usually different) employees in the same request.

---

## ✅ Backend Tasks

- [ ] 🔧 Add a bulk endpoint, e.g. `POST /api/v1/attendances/overtime-decisions/bulk`, via a new `BulkOvertimeDecisionController` + `BulkOvertimeDecisionRequest` — accepts `attendance_ids: string[]` (ULIDs) plus the same decision fields as `OvertimeDecisionRequest` (`authorize`, `valuation_method`, `agreed_rate`, `agreed_factor`, `reason`)
- [ ] 🔧 Add `RecordBulkOvertimeDecisionAction` that applies `RecordOvertimeDecisionAction` per attendance, keeping each attendance's own DB transaction and the existing per-employee `lockForUpdate()` for `LFT_PROPORTIONAL`, so one failed/already-decided item doesn't abort the rest of the batch
- [ ] 📤 Response reports a per-attendance result (success + updated attendance, or the validation error) rather than all-or-nothing, so the frontend can show which employees (if any) failed
- [ ] 🧪 Feature tests: full batch success, a batch where one attendance was already decided by another manager (partial success, rest still applied), unauthorized access, and `LFT_PROPORTIONAL` across multiple employees in the same batch
- [ ] 📝 Swagger schema for the new endpoint request/response

## ✅ Frontend Tasks

- [ ] 🔲 Add an "Aplicar para el resto (N empleados)" checkbox to `OvertimeDecisionDialog.tsx`, shown only when opened from the bulk flow and the queue has more than one remaining entry (not shown for the single/individual `pendingOvertimeDecision` flow)
- [ ] 🔧 Extend `onAuthorize`/`onReject` (or add an `applyToRest: boolean` param) so the dialog reports the checkbox state alongside the decision
- [ ] 🔁 In `-use-today-attendance-page.ts`, when `applyToRest` is true, call the new bulk endpoint once with every remaining `attendance_id` in `bulkOvertimeQueue` and the chosen `authorize`/`valuation_method`/`agreed_rate`/`agreed_factor`, instead of looping the single-decision mutation; clear the queue once the response comes back
- [ ] 🎨 Surface any partial failures reported by the bulk response (e.g. toast listing employees that couldn't be updated) instead of silently dropping them
- [ ] 🧪 Cover both paths: "Pagar" + valuation method + apply-to-rest, and "No pagar" + apply-to-rest

---

## 🎯 Acceptance Criteria

- [ ] The "Aplicar para el resto" checkbox only appears in the bulk (day-close) flow, and only when there's more than one pending entry left
- [ ] Checking it and confirming sends a single batch request that applies the exact same decision to every remaining employee in the queue, without showing further dialogs
- [ ] Leaving it unchecked preserves current behavior — one dialog and one request per employee
- [ ] Works from both the initial "¿Se pagan?" step (No pagar) and the "Método de valoración" step (Pagar)
- [ ] A partial failure in the batch (e.g. an attendance already decided concurrently) is reported to the admin and doesn't block the rest of the batch from being applied

---

## 🔗 References

- Builds on #229 (bulk overtime queue in the day-close flow) and #228 (valuation method dialog + preview)
- Existing single-decision endpoint: `PATCH /api/v1/attendances/{id}/overtime-decision` (`OvertimeDecisionController`, `RecordOvertimeDecisionAction`)

---

## ⏱️ Estimates

- **Optimistic:** `5h` · **Pessimistic:** `9h`

---

## ⏱️ Sessions
```json
[]
```
