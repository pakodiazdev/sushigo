# 🗄️ Task #017: EmploymentPeriod Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `EmploymentPeriod` migration and model, to support employment periods with re-hire capability.

**Español:**
Como desarrollador, necesito crear la migración y modelo `EmploymentPeriod`, para soportar periodos laborales con reingresos.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_employment_periods_table` — id, employee_id (FK → employees), branch_id (FK → branches), start_date, end_date (nullable = active), termination_reason (varchar nullable), is_active (bool default true), meta (json nullable), timestamps
- [ ] 🔧 Create `EmploymentPeriod` model — $fillable, $casts, relationships: belongsTo(Employee), belongsTo(Branch), hasMany(EmployeeSchedule)
- [ ] 🔧 Add scope active() — is_active = true
- [ ] 🔧 Add app-level validation: max 1 active period per employee_id
- [ ] 🏭 Create EmploymentPeriodFactory
- [ ] 🧪 Unit test: create period, active scope, only-one-active constraint

---

## 🎯 Acceptance Criteria

- [ ] Migration runs
- [ ] Only one active period per employee enforced
- [ ] Branch relationship works

---

## 🔗 References

- **Backlog:** AP-003
- RF-05, RF-06
- domain-model.md §2.2 `employment_periods`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
