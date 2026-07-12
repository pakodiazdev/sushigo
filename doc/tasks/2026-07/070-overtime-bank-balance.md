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
- **Optimistic:** `3h` · **Pessimistic:** `5h` · **Tracked:** _in progress_

### 📅 Sessions
```json
[
  { "date": "2026-07-12", "start": "17:15", "end": "?" }
]
```
