# 🗄️ Task #022: EmployeeSchedule & ScheduleDay Migrations & Models

## 📖 Story

**English:**
As a developer, I need to create the schedule migrations and models, to define the punctuality calculation baseline.

**Español:**
Como desarrollador, necesito crear las migraciones y modelos de horarios, para definir la base de cálculo de puntualidad.

---

## ✅ Technical Tasks

- [x] 📂 Create migration `create_employee_schedules_table` — id, public_id (ULID), employment_period_id (FK restrictOnDelete), name (varchar 100), effective_from (date), effective_to (date nullable), workday_type (enum: FULL|PARTIAL), working_days_per_week (smallint default 6), timestamps, softDeletes
- [x] 📂 Create migration `create_schedule_days_table` — id, employee_schedule_id (FK cascadeOnDelete), day_of_week (smallint 1-7 ISO), is_day_off (bool default false), expected_start (time nullable), expected_lunch_start (time nullable), expected_lunch_end (time nullable), expected_end (time nullable), timestamps. UNIQUE(employee_schedule_id, day_of_week)
- [x] 🔧 Create `WorkdayType` enum: FULL, PARTIAL
- [x] 🔧 Create `EmployeeSchedule` model — HasPublicId, SoftDeletes, hasMany(ScheduleDay), belongsTo(EmploymentPeriod), scope effective(date), method dayConfig(dayOfWeek), method workingDays()
- [x] 🔧 Create `ScheduleDay` model — belongsTo(EmployeeSchedule), methods: isDayOff(), expectedDurationMinutes()
- [x] 🔧 Add expected_lunch_start field (needed for net duration calculation: gross − lunch break)
- [x] 🔧 Partial unique index (PostgreSQL): only one active (open-ended) schedule per employment_period
- [x] 🔧 CHECK constraint: effective_to IS NULL OR effective_to >= effective_from
- [x] 🔧 CHECK constraint: day_of_week BETWEEN 1 AND 7
- [x] 🏭 Create EmployeeScheduleFactory (states: closed, current, full, partial, effectiveBetween, withWorkingDaysPerWeek)
- [x] 🏭 Create ScheduleDayFactory (states: dayOff, workDay, monday…sunday, withTimes)
- [x] 🔧 Add hasMany(EmployeeSchedule) to EmploymentPeriod model
- [x] 🔧 Add hasManyThrough(EmployeeSchedule, EmploymentPeriod) to Employee model
- [x] 🧪 Unit tests: 29 tests ✅ — effective scope (6), dayConfig (2), workingDays (1), constraints (3), isDayOff (2), expectedDurationMinutes (4), relationships (5), casts & schema (5), soft delete (1)

---

## 🎯 Acceptance Criteria

- [x] UNIQUE(schedule_id, day_of_week) enforced
- [x] effective() scope filters correctly
- [x] isDayOff() returns correctly
- [x] expectedDurationMinutes() subtracts lunch when both boundaries are set

---

## 🔗 References

- **Backlog:** AP-007
- RF-08, RF-09, RF-10
- domain-model.md §2.3, §2.4

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
