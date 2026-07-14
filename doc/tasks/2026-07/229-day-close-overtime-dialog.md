# ⚙️ Task #229: Apply overtime valuation dialog to the day-close batch flow

## 📖 Story

**English:** As an Admin closing the day for a branch, when the system flags pending overtime decisions (`overtime_pending`), I want the same two-step decision (authorize + valuation method, with its live cost preview) available in the batch flow, so I don't have to leave day-close to decide each one individually on the attendance screen.

**Español:** Como Admin cerrando el día de una sucursal, cuando el sistema marca decisiones de hora extra pendientes (`overtime_pending`), quiero contar con la misma decisión de dos pasos (autorizar + método de valoración, con su preview de costo en vivo) dentro del flujo de cierre de día, para no tener que salir de esa pantalla a decidir cada una individualmente en la pantalla de asistencia.

---

## 🔍 Investigation finding

The frontend reuse required by this issue is **already structurally in place**, as a side effect of two earlier tasks:

- **#101** unified the individual and bulk overtime-decision flows onto one shared `OvertimeDecisionDialog` instance in `pages/attendance/index.tsx`, fed by `resolveOvertimeDialog()` (individual pending decision takes priority over the bulk queue).
- **#228** extended that *same* shared dialog with the two-step authorize → valuation-method UI (LFT / agreed rate / salary factor + live preview). Because #228 modified the shared component instead of duplicating it, the bulk/day-close queue automatically inherited the two-step flow.

**The actual gap**: `code/webapp/cypress/e2e/attendance-close-day-overtime.cy.ts` (written for the bulk flow in #101) was never updated for the two-step dialog introduced by #228. It still clicks `btn-authorize-overtime` and expects the `overtime-decision` PATCH to fire immediately — but since #228, that button only advances to the method-selection step. The PATCH now only fires after `btn-confirm-valuation`. This spec is stale.

## ✅ Backend Tasks

- [x] None — confirmed no backend changes needed (`CloseDayAction` already returns `overtime_pending`, endpoint/decision action already extended by #228)

## ✅ Frontend Tasks

- [x] None — reuse already complete via shared `OvertimeDecisionDialog` + `resolveOvertimeDialog` + bulk queue in `pages/attendance/index.tsx` / `-use-today-attendance-page.ts`

## ✅ Tests

- [x] 🐛 Fix `attendance-close-day-overtime.cy.ts` — drive the authorize decision through the two-step dialog, matching the pattern in `attendance-overtime-decision.cy.ts`

## 🐛 Bug found during E2E fix

Running the corrected spec surfaced a real bug: `useOvertimeDecisionDialog`'s step-reset effect only depended on `isOpen`, but in the bulk day-close queue `isOpen` stays `true` continuously as `resolveOvertimeDialog` (pages/attendance/index.tsx) advances through pending employees — only `attendanceId` changes. The dialog for employee 2+ opened directly on the "Método de valoración" step instead of resetting to "Decisión de horas extra". Fixed by adding `attendanceId` to the effect's dependency array (`code/webapp/src/components/attendance/use-overtime-decision-dialog.ts`), with a new hook test covering the scenario.

---

## 🎯 Acceptance Criteria

- [x] Al cerrar el día, cada hora extra pendiente se puede autorizar (con método de valoración y su preview de costo) o rechazar desde el mismo flujo de cierre, sin salir a la pantalla de asistencia individual — already true via shared component
- [x] No se duplica lógica de negocio — se reutiliza el endpoint y componentes de #228 — confirmed, single dialog/mutation instance

---

## 🔗 References

- Depende de #228 (completado)
- Relacionado con #101 (unificación original del diálogo compartido)

---

## ⏱️ Estimates

- **Optimistic:** `1h` · **Pessimistic:** `2h`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `1h05m`

### 📅 Sessions
```json
[
  { "date": "2026-07-14", "start": "02:10", "end": "03:15" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 05m
- **vs optimistic:** +5m
- **vs pessimistic:** -55m

**Justification:** The frontend reuse was already structurally complete from #101/#228 — no new component work needed. The E2E spec was stale (still asserting the old one-step click), and fixing it surfaced a genuine bug: the shared dialog's step state didn't reset when the bulk queue advanced to the next employee (`isOpen` stays `true` across the queue, only `attendanceId` changes). Fixed with a one-line dependency-array change plus a targeted hook test. Landed within the original estimate.
