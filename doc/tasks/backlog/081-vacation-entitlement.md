# 🌴 Task #081: Register Vacation Entitlement

## 📖 Story

**English:**
As an Admin, I want to register an employee's annual vacation entitlement (days earned per year per LFT), so the system can track their available balance.

**Español:**
Como Admin, quiero registrar el derecho vacacional anual de un empleado (días ganados por año según LFT), para que el sistema controle su saldo disponible.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_vacation_entitlements_table` — employee_id (FK), year (smallint), entitled_days (smallint), used_days (smallint default 0), timestamps; UNIQUE(employee_id, year)
- [ ] 🔧 `VacationEntitlement` model — method `remainingDays()`: entitled_days − used_days
- [ ] 🌐 `POST /api/v1/employees/{id}/vacation-entitlements` — body: `{ year, entitled_days }`; 422 if already exists for that year
- [ ] 🌐 `GET /api/v1/employees/{id}/vacation-entitlements` — history by year with remaining_days computed
- [ ] 🧪 Feature tests: create, duplicate rejected, remainingDays computation

## ✅ Frontend Tasks

- [ ] 📂 Create **Vacaciones tab** in Employee Detail
- [ ] 📝 Add `VacationEntitlement` type to `src/types/attendance-payroll.ts`
- [ ] 🔧 `registerEntitlement(employeeId, data)` + `getEntitlements(employeeId)` in `src/services/vacation.service.ts`
- [ ] 📱 **Entitlements table** — year, entitled days, used days, remaining days (highlighted if low)
- [ ] 📱 **"Registrar derecho" button** — opens form: year selector, entitled_days number input
- [ ] 🔧 `useVacationEntitlements(employeeId)` hook

---

## 🎯 Acceptance Criteria

- [ ] Admin can register annual entitlement and see it in the table with remaining days
- [ ] Registering the same year twice shows a friendly duplicate error
- [ ] Remaining days updates as vacation requests are approved (#082)

---

## 🔗 References

- **Backlog:** AP-052, AP-053 · RF-26

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`
