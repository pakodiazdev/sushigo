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
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `1h08m`

### 📅 Sessions
```json
[
  { "date": "2026-07-13", "start": "18:58", "end": "20:06" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 08m (68m)
- **vs optimistic:** +8m
- **vs pessimistic:** −52m

**Justification:** Landed close to the optimistic estimate. The schema and enum values from #070 already covered USED/ADJUSTMENT, so no migration was needed, and the closest existing UI/backend analogs (RegisterVacationRequestDialog, CreateWageController, VacationRequestGuards) gave a direct pattern to follow for the request/action/dialog/hook, which kept implementation and test-writing straightforward with no unplanned rework.
