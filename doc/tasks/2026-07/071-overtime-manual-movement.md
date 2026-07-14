# ✍️ Task #071: Register Manual Overtime Bank Movement

## 📖 Story

**English:**
As an Admin, I want to register a manual USED or ADJUSTMENT movement in an employee's overtime bank, so I can redeem time off or correct balance errors.

**Español:**
Como Admin, quiero registrar un movimiento manual USADO o AJUSTE en el banco de horas extra de un empleado, para canjear tiempo libre o corregir errores de saldo.

---

## ✅ Backend Tasks

- [x] 🌐 `POST /api/v1/employees/{id}/overtime-bank/movements` — CreateManualOvertimeMovementController
- [x] 📝 Request — `{ date, minutes, movement_type: USED|ADJUSTMENT, reason }`; origin = MANUAL; authorized_by = auth user
- [x] 🔧 Validation: if USED, resulting balance cannot be negative
- [x] 🧪 Feature tests: USED movement, ADJUSTMENT (positive/negative), USED rejected if balance insufficient

## ✅ Frontend Tasks

- [x] 🔧 `createManualMovement(employeeId, data)` in `src/services/overtime-bank-api.ts` (existing #070 service file, not `overtime.service.ts` as originally noted)
- [x] 📱 **"Movimiento manual" button** in the Overtime Bank section (#070) — opens modal (admin only)
- [x] 📱 **Manual movement modal** (react-hook-form + zod) — movement_type selector, minutes, date, reason
- [x] 📱 After save: balance and movements table refresh
- [x] 🔧 Mutation added via new `useCreateManualOvertimeMovement` hook in `overtime-bank-hooks.ts`

---

## 🎯 Acceptance Criteria

- [x] Admin can register USED or ADJUSTMENT movements with a reason
- [x] Form shows an error if a USED movement would make the balance negative
- [x] Balance updates immediately after saving

---

## 🔗 References

- **Backlog:** AP-039 · RF-43, RF-44

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `1h57m`

### 📅 Sessions
```json
[
  { "date": "2026-07-13", "start": "18:58", "end": "20:06" },
  { "date": "2026-07-13", "start": "20:07", "end": "20:29" },
  { "date": "2026-07-13", "start": "20:48", "end": "21:15" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 57m (68m + 22m + 27m)
- **vs optimistic:** +57m
- **vs pessimistic:** −3m

**Justification:** Session 1 (implementation, 68m) landed close to the optimistic estimate — the schema and enum values from #070 already covered USED/ADJUSTMENT, so no migration was needed, and the closest existing UI/backend analogs (RegisterVacationRequestDialog, CreateWageController, VacationRequestGuards) gave a direct pattern to follow for the request/action/dialog/hook. Session 2 (22m) addressed the 2 automated Copilot review comments on the PR; SonarCloud quality gates passed clean on both `api` and `webapp` with no further fixes needed. Session 3 (27m) is this closing pass (task file + issue update) after the user merged the PR.
