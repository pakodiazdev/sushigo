# 🗄️ Task #015: Employee Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `Employee` migration and model with base fields, to establish the foundational entity for the attendance-payroll module.

**Español:**
Como desarrollador, necesito crear la migración y modelo `Employee` con campos base, para establecer la entidad fundacional del módulo attendance-payroll.

---

## ✅ Technical Tasks

- [x] 📂 Create migration `create_employees_table` — id, user_id (FK nullable → users), code (varchar 20, unique), first_name (varchar 100), last_name (varchar 100), role (enum: MANAGER|COOK|KITCHEN_ASSISTANT|DELIVERY_DRIVER), is_active (bool default true), meta (json nullable), timestamps, soft_deletes
- [x] 🔧 Create `EmployeeRole` enum class with values: MANAGER, COOK, KITCHEN_ASSISTANT, DELIVERY_DRIVER
- [x] 🔧 Create `Employee` model — $fillable, $casts (role → enum, is_active → bool, meta → array), traits: HasFactory, SoftDeletes
- [x] 🔧 Add relationships: belongsTo(User) _(hasMany for EmploymentPeriod, WageHistory, Attendance deferred to tasks #017, #018, #025)_
- [x] 🔧 Add scopes: active(), byRole(role)
- [x] 🏭 Create EmployeeFactory with valid fake data
- [x] 🧪 Feature test: create employee, soft delete, unique code constraint, user relationship

---

## 🎯 Acceptance Criteria

- [x] Migration runs without errors
- [x] Model creates/reads/deletes correctly
- [x] Factory generates valid data
- [x] Enum restricts to valid roles

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
