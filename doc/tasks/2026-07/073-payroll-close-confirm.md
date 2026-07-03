# ✅ Task #073: Confirm Weekly Payroll Close

## 📖 Story

**English:**
As a Manager, I want to confirm the weekly payroll close to freeze the calculated results, so the data cannot be modified and serves as the official record.

**Español:**
Como Manager, quiero confirmar el cierre semanal de nómina para congelar los resultados calculados, de modo que los datos no puedan modificarse y sirvan como registro oficial.

---

## ✅ Backend Tasks

- [x] 🌐 `POST /api/v1/pay-periods` — ConfirmCloseController
- [x] 📝 Request — `{ branch_id, period_start, period_end }`
- [x] 🔧 Runs PayrollCalculator for all active employees; creates PayPeriod (status=CLOSED, closed_by, closed_at), PayPeriodEmployee per employee, PayPeriodLine per concept/day; wraps in DB transaction
- [x] 🔧 422 if a closed period already exists for that range
- [x] 🧪 Feature tests: successful close, duplicate close rejected

## ✅ Frontend Tasks

- [x] 🔧 `confirmClose(branchId, periodStart, periodEnd)` in `src/services/payroll.service.ts`
- [x] 📱 **"Confirmar cierre" button** at the bottom of the preview (#072) — triggers confirmation dialog
- [x] 📱 **Confirmation dialog** — shows period range and total employees; "Confirmar y cerrar" / "Cancelar"
- [x] 📱 On success: redirects to `/attendance` index (#074 closed-detail page not built yet); shows success toast
- [x] 📱 Duplicate period error maps to: "Ya existe un cierre para este periodo"
- [x] 🔧 Mutation added in `useConfirmClose` (`payroll-hooks.ts`), wired through `useClosePreviewPage`

---

## 🎯 Acceptance Criteria

- [x] Manager confirms and the period is frozen with status CLOSED
- [x] Attempting to close the same period twice returns a friendly error
- [x] After confirmation, Manager is redirected to `/attendance` (closed period detail page is #074, not yet built — see scope note below)

---

## 📝 Scope note

Issue #074 (closed period detail page) doesn't exist yet, so there's no route to redirect to.
Decided with the user to keep #073 scoped to the close endpoint + confirmation dialog only:
redirect goes to the existing `/attendance` index instead of a not-yet-built detail page or a
new pay-periods list page (which would have required its own backend/frontend work, out of
scope for this issue).

---

## 🔗 References

- **Backlog:** AP-046 · RF-20, RN-16

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `3h` · **Tracked:** `~5h48m`

### 📅 Sessions
```json
[
  { "date": "2026-07-03", "start": "02:11", "end": "07:59" }
]
```
