# 🗄️ Task #049: PayPeriod, PayPeriodEmployee & PayPeriodLine Migrations & Models

## 📖 Story

**English:**
As a developer, I need to create the payroll close migrations and models, to store weekly pay snapshots.

**Español:**
Como desarrollador, necesito crear las migraciones y modelos del cierre semanal, para almacenar snapshots de nómina.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_pay_periods_table` — id, branch_id (FK), period_start, period_end, status (enum: OPEN|CLOSED|REOPENED), closed_by (FK nullable), closed_at (nullable), reopened_by (FK nullable), reopened_at (nullable), reopen_reason (text nullable), meta (json nullable), timestamps. UNIQUE(branch_id, period_start, period_end)
- [ ] 📂 Create migration `create_pay_period_employees_table` — id, pay_period_id (FK), employee_id (FK), base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, holiday_pay, other_adjustments, total_pay, free_hours_earned, daily_snapshot (json), timestamps. UNIQUE(pay_period_id, employee_id)
- [ ] 📂 Create migration `create_pay_period_lines_table` — id, pay_period_employee_id (FK), date, concept (enum), description, amount, minutes (nullable), meta (json nullable), timestamps
- [ ] 🔧 Create enums: PayPeriodStatus, PayConcept
- [ ] 🔧 Create models with relationships and methods: isOpen(), isClosed(), calculateTotal()
- [ ] 🏭 Create factories
- [ ] 🧪 Unit tests: status methods, total formula, unique constraints

---

## 🎯 Acceptance Criteria

- [ ] 3 migrations run
- [ ] PayPeriodStatus and PayConcept enums work
- [ ] calculateTotal matches formula

---

## 🔗 References

- **Backlog:** AP-040
- RF-20
- domain-model.md §2.20, §2.21, §2.22

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h`
- **Pessimistic:** `5h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
