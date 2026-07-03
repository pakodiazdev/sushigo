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
- **Optimistic:** `2h` · **Pessimistic:** `3h` · **Tracked:** `~7h30m`

### 📅 Sessions
```json
[
  { "date": "2026-07-03", "start": "01:00", "end": "02:30" },
  { "date": "2026-07-03", "start": "07:00", "end": "10:00" },
  { "date": "2026-07-03", "start": "13:00", "end": "16:00" }
]
```

## 📊 Retrospective
- **Actual total:** 7h 30m (90 min + 180 min + 180 min)
- **vs optimistic:** +5h 30m
- **vs pessimistic:** +4h 30m

**Justification:**

The core deliverable — the close endpoint, confirmation dialog, and their tests — landed close to the original 2–3h estimate. The overrun came from work bundled into the same PR at the user's request, none of which was in the original scope:

- A scope discussion on the post-close redirect target, since #074 (closed period detail) doesn't exist yet, requiring a decision and a documented scope note.
- A Dev Debugger DX improvement (mobile bottom bar, per-section quick-link icons, recovered clock-shift buttons from a stash) that went through three rounds of clarification and rework as the intended design was refined.
- Three new repo-wide conventions (PR title format, mandatory manual-testing PR section, no-credentials rule), each requiring edits across two repositories (`sushigo` and `sushigo-dev-lab`) plus a new dev-lab issue and PR.
- A full review cycle: addressing 3 Copilot review threads, then a separate pass fixing SonarCloud quality-gate issues across both `api` and `webapp` projects, then two more rounds of inline-FQCN convention fixes.
- A final commit-history consolidation (17 commits → 5) at the user's request.

None of this was scope creep in the sense of expanding the payroll-close feature itself — it was additional, explicitly requested work riding on the same session and PR.
