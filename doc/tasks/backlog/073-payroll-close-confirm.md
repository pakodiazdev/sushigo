# ✅ Task #073: Confirm Weekly Payroll Close

## 📖 Story

**English:**
As a Manager, I want to confirm the weekly payroll close to freeze the calculated results, so the data cannot be modified and serves as the official record.

**Español:**
Como Manager, quiero confirmar el cierre semanal de nómina para congelar los resultados calculados, de modo que los datos no puedan modificarse y sirvan como registro oficial.

---

## ✅ Backend Tasks

- [ ] 🌐 `POST /api/v1/pay-periods` — ConfirmCloseController
- [ ] 📝 Request — `{ branch_id, period_start, period_end }`
- [ ] 🔧 Runs PayrollCalculator for all active employees; creates PayPeriod (status=CLOSED, closed_by, closed_at), PayPeriodEmployee per employee, PayPeriodLine per concept/day; wraps in DB transaction
- [ ] 🔧 422 if a closed period already exists for that range
- [ ] 🧪 Feature tests: successful close, duplicate close rejected

## ✅ Frontend Tasks

- [ ] 🔧 `confirmClose(branchId, periodStart, periodEnd)` in `src/services/payroll.service.ts`
- [ ] 📱 **"Confirmar cierre" button** at the bottom of the preview (#072) — triggers confirmation dialog
- [ ] 📱 **Confirmation dialog** — shows period range and total employees; "Confirmar y cerrar" / "Cancelar"
- [ ] 📱 On success: redirects to closed period detail (#074); shows success toast
- [ ] 📱 Duplicate period error maps to: "Ya existe un cierre para este periodo"
- [ ] 🔧 Mutation in `useClosePreview` hook

---

## 🎯 Acceptance Criteria

- [ ] Manager confirms and the period is frozen with status CLOSED
- [ ] Attempting to close the same period twice returns a friendly error
- [ ] After confirmation, Manager is redirected to the closed period detail

---

## 🔗 References

- **Backlog:** AP-046 · RF-20, RN-16

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`
