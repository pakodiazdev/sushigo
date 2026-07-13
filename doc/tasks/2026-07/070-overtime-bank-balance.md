# 🏦 Task #070: View Overtime Bank Balance

## 📖 Story

**English:**
As a Manager or Admin, I want to see an employee's overtime bank balance and movement history, so I can track how many overtime minutes have been earned, paid, or used.

**Español:**
Como Manager o Admin, quiero ver el saldo del banco de horas extra de un empleado y su historial de movimientos, para rastrear cuántos minutos de horas extra se han acumulado, pagado o usado.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_overtime_bank_movements_table` — employee_id (FK), attendance_id (FK nullable), date, movement_type (enum: EARNED|USED|PAID|ADJUSTMENT), origin (enum: AUTO|MANUAL), minutes, valuation_method (nullable), applied_rate (decimal nullable), amount (decimal nullable), authorized_by (FK nullable), authorized_at (nullable), reason (nullable), timestamps
- [ ] 🔧 `OvertimeBankMovement` model — method `balanceImpact()`: EARNED=+minutes, USED/PAID=−minutes, ADJUSTMENT=±minutes
- [ ] 🔧 On check-out (existing endpoint): if `overtime_minutes > 0`, auto-create EARNED movement (origin=AUTO); if overtime authorized (AP-016), create PAID movement using OvertimePayConfig
- [ ] 🌐 `GET /api/v1/employees/{id}/overtime-bank` — balance (Σ balanceImpact) + movements list
- [ ] 🧪 Unit test: balanceImpact per type; Feature test: checkout with overtime creates EARNED, authorization creates PAID

## ✅ Frontend Tasks

- [ ] 📝 Add `OvertimeBankMovement`, `OvertimeMovementType` types to `src/types/attendance-payroll.ts`
- [ ] 🔧 `getOvertimeBank(employeeId)` in `src/services/overtime.service.ts`
- [ ] 📱 **Overtime Bank section** in Employee Detail — balance card (minutes + formatted as h:mm); movements table below
- [ ] 📱 Movement table columns: date, type badge (EARNED/PAID/USED/ADJUSTMENT), origin badge (AUTO/MANUAL), minutes, amount, authorized by
- [ ] 🔧 `useOvertimeBank(employeeId)` hook

---

## 🎯 Acceptance Criteria

- [ ] After an overtime checkout + authorization, the balance updates and both EARNED and PAID movements appear
- [ ] Balance is shown in minutes and in h:mm format
- [ ] AUTO movements are visually distinct from MANUAL ones

---

## 🔗 References

- **Backlog:** AP-034, AP-036, AP-038 · RF-42–46, DC-01

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `5h` · **Tracked:** `~5h47m`

### 📅 Sessions
```json
[
  { "date": "2026-07-12", "start": "17:15", "end": "21:57" },
  { "date": "2026-07-13", "start": "00:05", "end": "01:00" },
  { "date": "2026-07-13", "start": "16:40", "end": "16:50" }
]
```

## 📊 Retrospective
- **Actual total:** 5h 47m (282m + 55m + 10m)
- **vs optimistic:** +2h 47m
- **vs pessimistic:** +47m

**Justification:**

The core implementation (session 1, 4h42m) ran close to the pessimistic estimate on its own. Two things drove that: first, the `overtime_bank_movements` table already existed from an earlier PR with a schema that conflicted with what the issue described (`type` enum `EARNED|PAID|EXPIRED|TRANSFERRED` vs. the issue's `movement_type`/`origin` vocabulary), which required a design discussion with the user before writing any code, plus a more involved `ALTER TABLE` migration than a plain `CREATE` would have been. Second, `PayPeriodPreviewService` was already silently expecting `PAID` movements to exist for its payroll calculations, but nothing in the codebase ever created them for real — tracing that and deciding PAID creation belongs at payroll-close time (not at overtime authorization) took extra investigation. Real end-to-end browser verification (API smoke test + a from-scratch Cypress spec against the E2E stack, since none existed for this endpoint) also added time, including debugging a DevDebugger-overlay/`cy.contains()`-scoping flakiness that turned out to be a genuine `cy.contains('0:00')` ambiguous-match bug in the spec itself.

Sessions 2–3 (1h05m) were not part of the original implementation estimate: session 2 addressed two automated Copilot review comments post-PR (a legacy-enum-value migration safety fix and a Cypress Dev Debugger timing fix) plus SonarCloud quality gate verification for both `api` and `webapp` projects — both gates passed clean on the first check, no additional fixes needed there. Session 3 is this closing pass (task file + issue update) after the user merged the PR.
