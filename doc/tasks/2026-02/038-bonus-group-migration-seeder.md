# 🗄️ Task #038: PunctualityBonusGroup & EmployeeBonusConfig Migrations

## 📖 Story

**English:**
As a developer, I need to create bonus group and employee assignment models, to support bonus proration.

**Español:**
Como desarrollador, necesito crear los modelos de grupo de bono y asignación a empleados, para soportar el prorrateo.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_punctuality_bonus_groups_table` — id, name (varchar 50), weekly_bonus_amount (decimal 10,2), working_days_divisor (smallint), is_active (bool), timestamps
- [ ] 📂 Create migration `create_employee_bonus_configs_table` — id, employee_id (FK), punctuality_bonus_group_id (FK), effective_from, effective_to (nullable), timestamps
- [ ] 🔧 Create `PunctualityBonusGroup` model — method dailyBonusAmount() = weekly / divisor
- [ ] 🔧 Create `EmployeeBonusConfig` model — scope effective(date), belongsTo both
- [ ] 🌱 Seeder: Group $110 (÷6), Group $100 (÷6), Group $50 (÷3)
- [ ] 🧪 Unit tests: dailyBonusAmount ($110/6 = $18.33), effective scope

---

## 🎯 Acceptance Criteria

- [ ] 3 groups seeded
- [ ] Daily proration calculated correctly

---

## 🔗 References

- **Backlog:** AP-025
- RF-33, RF-34
- domain-model.md §2.17, §2.18

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1.5h`
- **Pessimistic:** `3h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
