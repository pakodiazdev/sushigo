# ✍️ Task #071: Register Manual Overtime Bank Movement

## 📖 Story

**English:**
As an Admin, I want to register a manual USED or ADJUSTMENT movement in an employee's overtime bank, so I can redeem time off or correct balance errors.

**Español:**
Como Admin, quiero registrar un movimiento manual USADO o AJUSTE en el banco de horas extra de un empleado, para canjear tiempo libre o corregir errores de saldo.

---

## ✅ Backend Tasks

- [ ] 🌐 `POST /api/v1/employees/{id}/overtime-bank/movements` — ManualOvertimeMovementController
- [ ] 📝 Request — `{ date, minutes, movement_type: USED|ADJUSTMENT, reason }`; origin = MANUAL; authorized_by = auth user
- [ ] 🔧 Validation: if USED, resulting balance cannot be negative
- [ ] 🧪 Feature tests: USED movement, ADJUSTMENT (positive/negative), USED rejected if balance insufficient

## ✅ Frontend Tasks

- [ ] 🔧 `createManualMovement(employeeId, data)` in `src/services/overtime.service.ts`
- [ ] 📱 **"Movimiento manual" button** in the Overtime Bank section (#070) — opens modal (admin only)
- [ ] 📱 **Manual movement modal** (react-hook-form + zod) — movement_type selector, minutes, date, reason
- [ ] 📱 After save: balance and movements table refresh
- [ ] 🔧 Mutation added to `useOvertimeBank` hook

---

## 🎯 Acceptance Criteria

- [ ] Admin can register USED or ADJUSTMENT movements with a reason
- [ ] Form shows an error if a USED movement would make the balance negative
- [ ] Balance updates immediately after saving

---

## 🔗 References

- **Backlog:** AP-039 · RF-43, RF-44

---

## ⏱️ Estimates

- **Optimistic:** `1h` · **Pessimistic:** `2h`
