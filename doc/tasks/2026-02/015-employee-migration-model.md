# 🗄️ Task #015: Employee Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `Employee` migration and model with base fields, to establish the foundational entity for the attendance-payroll module.

**Español:**
Como desarrollador, necesito crear la migración y modelo `Employee` con campos base, para establecer la entidad fundacional del módulo attendance-payroll.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_employees_table` — id, user_id (FK nullable → users), code (varchar 20, unique), first_name (varchar 100), last_name (varchar 100), role (enum: MANAGER|COOK|KITCHEN_ASSISTANT|DELIVERY_DRIVER), is_active (bool default true), meta (json nullable), timestamps, soft_deletes
- [ ] 🔧 Create `EmployeeRole` enum class with values: MANAGER, COOK, KITCHEN_ASSISTANT, DELIVERY_DRIVER
- [ ] 🔧 Create `Employee` model — $fillable, $casts (role → enum, is_active → bool, meta → array), traits: HasFactory, SoftDeletes
- [ ] 🔧 Add relationships: belongsTo(User), hasMany(EmploymentPeriod), hasMany(WageHistory), hasMany(Attendance)
- [ ] 🔧 Add scopes: active(), byRole(role)
- [ ] 🏭 Create EmployeeFactory with valid fake data
- [ ] 🧪 Feature test: create employee, soft delete, unique code constraint, user relationship

---

## 🎯 Acceptance Criteria

- [ ] Migration runs without errors
- [ ] Model creates/reads/deletes correctly
- [ ] Factory generates valid data
- [ ] Enum restricts to valid roles

---

## 🔗 References

- **Backlog:** AP-001
- RF-01, RF-02
- domain-model.md §2.1 `employees`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
