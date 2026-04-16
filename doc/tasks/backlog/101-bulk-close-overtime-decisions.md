# 🐛 Task #101: Show Overtime Decision Queue After Bulk Day Close

## 📖 Story

**English:**
As a Manager, when I close the day in bulk, I want to be prompted to authorize or reject overtime for each employee who worked extra time — the same way I am prompted when I check out employees individually.

**Español:**
Como Manager, cuando cierro el día en bloque, quiero que el sistema me pregunte si pago o no las horas extra de cada empleado que trabajó tiempo adicional — igual que cuando registro la salida de forma individual.

---

## 🐛 Bug Description

### What happens today

**Individual check-out flow:**
1. Manager clicks "Registrar salida" on an employee card.
2. `RegisterCheckOutAction` records `check_out` and computes `overtime_minutes`.
3. If `overtime_minutes > 0`, the card shows a "Decidir horas extra" button.
4. `OvertimeDecisionDialog` appears — manager selects "Pagar horas extra" or "No pagar".
5. `RecordOvertimeDecisionAction` sets `overtime_authorized`, `overtime_authorized_by`, `overtime_authorized_at`.

**Bulk "Cerrar día" flow (broken):**
1. Manager clicks "Cerrar día" → `CloseDayPanel` opens.
2. Manager confirms (optional step: lunch returns → confirm).
3. `CloseDayAction` calls `RegisterCheckOutAction` per employee — correctly computes `overtime_minutes`.
4. **Nothing happens.** No overtime decision dialogs. All `overtime_authorized_at` remain `NULL`.
5. The manager is never prompted. Payroll will see all overtime as undecided.

### Root cause

`CloseDayAction` returns only aggregate counts (`check_outs`, `absences`, etc.) and the
frontend (`use-close-day-panel.ts`) discards the response after calling `close()`.
There is no mechanism to surface which employees ended up with `overtime_minutes > 0`
after the batch check-out, nor any UI to queue those overtime decisions.

### Impact

Every manager who uses the "Cerrar día" button (the primary bulk flow) will silently skip
all overtime decisions for the day. Payroll will find `overtime_authorized_at = NULL`
for all bulk-closed employees, making overtime payment decisions impossible to track.

---

## ✅ Backend Tasks

- [ ] 🔧 **`CloseDayAction`** — after batch check-outs (step 2), query attendances with
  `overtime_minutes > 0` AND `overtime_authorized_at IS NULL`; collect them as
  `overtime_pending: [{attendance_id, employee_name, overtime_minutes}]`
- [ ] 🌐 **`CloseDayController` / response** — include `overtime_pending` array in the
  success response (additive, non-breaking change)
- [ ] 🧪 **`CloseDayTest`** — add test case: when one or more employees have overtime,
  `overtime_pending` is present in the response with the correct entries

## ✅ Frontend Tasks

- [ ] 📝 **`src/types/attendance.ts`** — add `OvertimePendingEntry` type and extend
  `CloseDayResponse` to include `overtime_pending?: OvertimePendingEntry[]`
- [ ] 🔧 **`src/services/attendance-api.ts`** — update `closeDay()` return type
- [ ] 🔧 **`use-close-day-panel.ts`** — expose `overtimePending: OvertimePendingEntry[]`
  from mutation `onSuccess`; add `clearOvertimePending()` helper
- [ ] 🔧 **`-use-today-attendance-page.ts`** — after bulk close succeeds, if
  `overtimePending.length > 0`, feed entries into the existing overtime decision queue
  (`openOvertimeDecision` / `confirmOvertimeDecision` infrastructure)
- [ ] 📱 **`CloseDayPanel.tsx`** — no structural changes needed; the post-panel dialog
  queue reuses the existing `OvertimeDecisionDialog` component already on the page

---

## 🎯 Acceptance Criteria

- [ ] When closing a day where at least one employee has overtime, the `OvertimeDecisionDialog`
  appears sequentially for each affected employee after the panel closes
- [ ] Manager can authorize or reject overtime for each employee — same as individual flow
- [ ] When no employee has overtime, the bulk close finishes without showing any dialog (no regression)
- [ ] `overtime_authorized_at` is set for all employees with overtime after the bulk close + queue
- [ ] Existing individual check-out overtime flow is unaffected

---

## 🔗 References

- `CloseDayAction` — `code/api/app/Actions/Attendances/CloseDayAction.php`
- `RegisterCheckOutAction` — `code/api/app/Actions/Attendances/RegisterCheckOutAction.php`
- `RecordOvertimeDecisionAction` — `code/api/app/Actions/Attendances/RecordOvertimeDecisionAction.php`
- `OvertimeDecisionDialog` — `code/webapp/src/components/attendance/OvertimeDecisionDialog.tsx`
- `use-close-day-panel.ts` — `code/webapp/src/components/attendance/use-close-day-panel.ts`
- `-use-today-attendance-page.ts` — `code/webapp/src/pages/attendance/-use-today-attendance-page.ts`
- **Related task:** #069 (overtime pay method config — not this bug, but same domain)

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`
