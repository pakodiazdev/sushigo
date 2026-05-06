# 👤 Task #065: Assign Bonus Group to Employee

## 📖 Story

**English:**
As an Admin, I want to assign a punctuality bonus group to an employee with an effective date, so the system knows which weekly bonus amount applies when calculating their punctuality.

**Español:**
Como Admin, quiero asignar un grupo de bono de puntualidad a un empleado con fecha de vigencia, para que el sistema sepa qué monto semanal aplica al calcular su puntualidad.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_employee_bonus_configs_table` — employee_id (FK), punctuality_bonus_group_id (FK), effective_from (date), effective_to (date nullable), timestamps
- [ ] 🔧 `EmployeeBonusConfig` model — scope `effective(date)`, `belongsTo(Employee)`, `belongsTo(PunctualityBonusGroup)`
- [ ] 🌐 `POST /api/v1/employees/{id}/bonus-config` — AssignBonusConfigController; on create auto-closes previous config
- [ ] 🌐 `GET /api/v1/employees/{id}/bonus-config` — current config + history
- [ ] 🧪 Feature tests: assign, auto-close previous, retrieve current

## ✅ Frontend Tasks

- [ ] 📝 Add `EmployeeBonusConfig` type to `src/types/attendance-payroll.ts`
- [ ] 🔧 `assignBonusConfig(employeeId, data)` + `getBonusConfig(employeeId)` in `src/services/config.service.ts`
- [ ] 📱 **Bonus config section** in Employee Detail → Configuration tab — shows current group (name, daily amount); "Cambiar grupo" button opens assignment form
- [ ] 📱 **Assignment form** — bonus group selector (populated from #064), effective_from date
- [ ] 🔧 `useEmployeeBonusConfig(employeeId)` hook

---

## 🎯 Acceptance Criteria

- [ ] Admin can assign a bonus group to an employee from their profile
- [ ] Current assignment shows the group name and computed daily amount
- [ ] Assigning a new group automatically closes the previous one

---

## 🔗 References

- **Backlog:** AP-025, AP-030 · RF-34

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`
