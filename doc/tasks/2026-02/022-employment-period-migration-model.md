# 🗄️ Task #017: EmploymentPeriod Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `EmploymentPeriod` migration and model, to support employment periods with re-hire capability.

**Español:**
Como desarrollador, necesito crear la migración y modelo `EmploymentPeriod`, para soportar periodos laborales con reingresos.

---

## ✅ Technical Tasks

### 🔧 Backend

- [x] 📂 Create migration `create_employment_periods_table` — id, public_id (ULID), employee_id (FK → employees), branch_id (FK → branches), start_date, end_date (nullable = active), termination_reason (varchar nullable), is_active (bool default true), meta (json nullable), timestamps, soft_deletes
- [x] 🔧 Create `EmploymentPeriod` model — $fillable, $casts, relationships: belongsTo(Employee), belongsTo(Branch), HasPublicId trait, durationInDays()
- [x] 🔧 Add scope active() — is_active = true
- [x] 🔧 Add hasMany(EmploymentPeriod) to Employee model
- [x] 🏭 Create EmploymentPeriodFactory with inactive() and terminated() states
- [x] 🧪 Feature tests: 16 tests — create period, ULID, relationships, active scope, one-active constraint, soft delete, termination reason, meta JSON, duration calculation, date casts, cascade deletes

### 🖥️ Frontend

- [x] 📝 Create `EmploymentPeriod` TypeScript types in `types/employment-period.ts`
- [x] 📝 Add `employment_periods` to Employee type (for eager loading)
- [x] 📱 **Employment Periods Tab** — component for Employee Detail page showing periods list (start_date, end_date, branch, status)
- [x] 📱 **Employment Period Card** — card component displaying period info with active/terminated badge
- [x] 📱 Prepare API client stub `employment-period-api.ts` (ready for Task #020)

---

## 🎯 Acceptance Criteria

### Backend

- [x] Migration runs without errors
- [x] Only one active period per employee enforced (app-level query check)
- [x] Branch relationship works
- [x] ULID public_id generated via HasPublicId trait
- [x] Cascade deletes on employee/branch force-delete

### Frontend

- [x] TypeScript types defined and exported
- [x] Employment Periods tab component ready (with loading + empty states)
- [x] Period card shows active/terminated status correctly via Badge
- [x] API client stub prepared for Task #020

---

## 🔗 References

- **Backlog:** AP-003
- RF-05, RF-06
- domain-model.md §2.2 `employment_periods`

---

## 🎯 Commits

- `a54ca8e` ✨ [#017] - Create EmploymentPeriod migration, model, factory & tests 🗄️

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** `~3h`

### 📅 Sessions

```json
[
  {
    "date": "2026-02-15 to 2026-02-17",
    "duration": "~3h",
    "commit": "a54ca8e",
    "summary": "EmploymentPeriod model with relationships (Employee, Branch), migration, factory with states (inactive, terminated), comprehensive unit tests (259 lines covering ULID, relationships, scopes, soft deletes, duration calculation), TypeScript types, employment periods tab component, period card component"
  }
]
```
