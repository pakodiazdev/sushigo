# 🗄️ Task #022: EmployeeSchedule & ScheduleDay Migrations & Models

## 📖 Story

**English:**
As a developer, I need to create the schedule migrations and models, to define the punctuality calculation baseline.

**Español:**
Como desarrollador, necesito crear las migraciones y modelos de horarios, para definir la base de cálculo de puntualidad.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_employee_schedules_table` — id, employment_period_id (FK), name (varchar 100), effective_from (date), effective_to (date nullable), workday_type (enum: FULL|PARTIAL), working_days_per_week (smallint default 6), timestamps
- [ ] 📂 Create migration `create_schedule_days_table` — id, employee_schedule_id (FK), day_of_week (smallint 1-7 ISO), is_day_off (bool default false), expected_start (time nullable), expected_lunch_end (time nullable), expected_end (time nullable), timestamps. UNIQUE(employee_schedule_id, day_of_week)
- [ ] 🔧 Create `WorkdayType` enum: FULL, PARTIAL
- [ ] 🔧 Create `EmployeeSchedule` model — hasMany(ScheduleDay), belongsTo(EmploymentPeriod), scope effective(date), method dayConfig(dayOfWeek)
- [ ] 🔧 Create `ScheduleDay` model — belongsTo(EmployeeSchedule), methods: isDayOff(), expectedDurationMinutes()
- [ ] 🏭 Create factories for both models
- [ ] 🧪 Unit tests: effective scope, dayConfig lookup, day-of-week uniqueness, duration calculation

---

## 🎯 Acceptance Criteria

- [ ] UNIQUE(schedule_id, day_of_week) enforced
- [ ] effective() scope filters correctly
- [ ] isDayOff() returns correctly

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
