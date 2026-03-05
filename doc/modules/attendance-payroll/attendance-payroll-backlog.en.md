# 📋 Product Backlog — Attendance & Payroll (SushiGo)

**Version:** 1.0
**Date:** 2026-02-09
**Base:** attendance-payroll-spec v0.8 + mvp-scope + domain-model v1.0
**Methodology:** Scrum — incremental vertical stories

---

## Conventions

- **ID:** `AP-NNN` (Attendance-Payroll)
- **Format:** As a [role], I want [action], so that [benefit].
- **Size:** S (< 1 day), M (1–2 days), L (2–3 days)
- **Priority:** P0 (blocker), P1 (core MVP), P2 (full MVP), P3 (post-MVP)
- **Acceptance Criteria (AC):** verifiable, one per line
- **Traceability:** each story references the FR/BR/DC it covers

---

## Epics

| Epic | Name                   | Stories         |
| ---- | ---------------------- | --------------- |
| E1   | Employees              | AP-001 → AP-006 |
| E2   | Schedules              | AP-007 → AP-011 |
| E3   | Daily Attendance       | AP-012 → AP-019 |
| E4   | Partial Leaves         | AP-020 → AP-023 |
| E5   | Punctuality & Bonuses  | AP-024 → AP-030 |
| E6   | Negotiated Extra Days  | AP-031 → AP-033 |
| E7   | Overtime Bank          | AP-034 → AP-039 |
| E8   | Weekly Close (payroll) | AP-040 → AP-047 |
| E9   | Leaves (full day)      | AP-048 → AP-051 |
| E10  | Vacations              | AP-052 → AP-055 |
| E11  | Holidays               | AP-056 → AP-058 |
| E12  | Reports & Exports      | AP-059 → AP-063 |
| E13  | Audit & Permissions    | AP-064 → AP-068 |

---

## E1 — Employees

### AP-001 · Employee Migration & Model ✅
**Size:** M · **Priority:** P0 · **FR:** RF-01, RF-02
**Commit:** `3eb59c8` · **Task:** #015

> As a developer, I want to create the migration and `Employee` model with its base fields, to have the foundational entity of the module.

**AC:**
- [x] Migration creates `employees` table with: id, user_id (FK nullable), code (unique), first_name, last_name, role (enum), is_active, meta (json), timestamps, soft_delete
- [x] `Employee` model with `$fillable`, `$casts`, traits `HasFactory`, `SoftDeletes`
- [x] `EmployeeRole` enum with values: MANAGER, COOK, KITCHEN_ASSISTANT, DELIVERY_DRIVER
- [x] Factory generates valid data
- [x] Unit test: creation, soft delete, relationship with User

---

### AP-002 · Employee CRUD API ✅
**Size:** M · **Priority:** P0 · **FR:** RF-01, RF-02
**Commits:** `a234744`, `6f95e7f` · **Task:** #016

> As an Admin, I want to create, list, view, update, and deactivate employees via API, to manage the workforce.

**AC:**
- [x] `POST /api/v1/employees` — creates employee (required field validation + unique code)
- [x] `GET /api/v1/employees` — lists employees (filter `?is_active=`, pagination)
- [x] `GET /api/v1/employees/{id}` — employee detail
- [x] `PUT /api/v1/employees/{id}` — updates data
- [x] `PATCH /api/v1/employees/{id}/toggle-active` — activates/deactivates
- [x] External IDs with Hashids (never expose incremental)
- [x] Feature tests for each endpoint (happy path + validations)

---

### AP-003 · EmploymentPeriod Migration & Model
**Size:** S · **Priority:** P0 · **FR:** RF-05, RF-06

> As a developer, I want to create the migration and `EmploymentPeriod` model, to support employment periods with re-entries.

**AC:**
- [ ] Migration creates `employment_periods` table: id, employee_id (FK), branch_id (FK), start_date, end_date (nullable), termination_reason (nullable), is_active, meta, timestamps
- [ ] Model with relationships: `belongsTo(Employee)`, `belongsTo(Branch)`
- [ ] Scope `active()` filters `is_active = true`
- [ ] App-level validation: maximum one period with `is_active = true` per employee_id
- [ ] Unit test

---

### AP-004 · Employment Periods API
**Size:** M · **Priority:** P1 · **FR:** RF-05, RF-06, RF-07

> As an Admin, I want to register and query employment periods for an employee, to control hires, terminations, and re-entries.

**AC:**
- [ ] `POST /api/v1/employees/{id}/employment-periods` — creates period (validates no other active one exists)
- [ ] `GET /api/v1/employees/{id}/employment-periods` — period history
- [ ] `PATCH /api/v1/employment-periods/{id}/terminate` — closes period (requires end_date + reason)
- [ ] Error 422 if attempting to create an active period when one already exists
- [ ] Feature tests

---

### AP-005 · WageHistory Migration & Model
**Size:** S · **Priority:** P0 · **FR:** RF-22

> As a developer, I want to create the migration and `WageHistory` model, to record hourly compensation rates with effective date history.

**AC:**
- [ ] Migration creates `wage_histories` table: id, employee_id (FK), hourly_rate (decimal 10,2), weekly_scheduled_hours (decimal 5,2), effective_from, effective_to (nullable), timestamps
- [ ] Model with scope `effective(date)` filtering by effective date
- [ ] Method `minuteRate()` → `hourly_rate / 60`
- [ ] Validation: hourly_rate > 0, weekly_scheduled_hours > 0
- [ ] Unit test

---

### AP-005a · Role-Based Assignment Control & Privilege Management ✅
**Size:** M · **Priority:** P0 · **FR:** RF-02, RF-17, RF-18
**Commit:** [pending] · **Task:** [pending]

> As an Admin, I want to restrict role assignment based on the authenticated user's privileges, so that only super-admins can assign super-admin roles and maintain proper authorization hierarchy.

**AC:**
- [x] Added `admin` and `super-admin` as position roles in `Employee::POSITION_ROLES`
- [x] Implemented `Employee::getAssignableRolesFor(?User)` method that returns allowed roles based on user privileges
- [x] Super-admins can assign all roles (including super-admin)
- [x] Non-super-admins can assign all roles except super-admin
- [x] Updated `syncPositionRoles($roles, $actingUser)` to accept acting user and enforce assignment restrictions
- [x] Created `GET /api/v1/employees/assignable-roles` endpoint returning dynamic role list
- [x] Updated all request validations to use `getAssignableRolesFor()` instead of static role lists
- [x] Frontend fetches and displays only assignable roles per authenticated user
- [x] Updated seeders with realistic scenarios (re-hires, terminations, random hire dates)
- [x] Configured admin role permissions for user and employee management
- [x] All tests updated to reflect 7 position roles (manager, cook, kitchen-assistant, delivery-driver, acting-manager, admin, super-admin)
- [x] UI visual indicators for admin/super-admin roles

---

### AP-006 · Wage History API
**Size:** S · **Priority:** P1 · **FR:** RF-22, RF-23

> As an Admin, I want to register and query an employee's wage history, to have traceability of increases.

**AC:**
- [ ] `POST /api/v1/employees/{id}/wages` — registers new wage (automatically closes previous one's effective date)
- [ ] `GET /api/v1/employees/{id}/wages` — wage history
- [ ] When creating a new wage, the previous one is closed (`effective_to = new.effective_from - 1 day`)
- [ ] Feature tests

---

## E2 — Schedules

### AP-007 · EmployeeSchedule + ScheduleDay Migration & Models
**Size:** M · **Priority:** P0 · **FR:** RF-08, RF-09, RF-10

> As a developer, I want to create the schedule migrations and models, to define the basis for punctuality calculation.

**AC:**
- [ ] Migration `employee_schedules`: id, employment_period_id (FK), effective_from, effective_to (nullable), workday_type (enum FULL|PARTIAL), working_days_per_week (default 6), timestamps
- [ ] Migration `schedule_days`: id, employee_schedule_id (FK), day_of_week (1-7 ISO), is_day_off, expected_start (time nullable), expected_lunch_end (time nullable), expected_end (time nullable), timestamps
- [ ] UNIQUE(employee_schedule_id, day_of_week)
- [ ] `EmployeeSchedule` model with `hasMany(ScheduleDay)`, scope `effective(date)`
- [ ] `ScheduleDay` model with methods `isDayOff()`, `expectedDurationMinutes()`
- [ ] Unit tests

---

### AP-008 · Create Schedule with Days API
**Size:** M · **Priority:** P1 · **FR:** RF-08, RF-09

> As an Admin, I want to create a complete schedule for an employee (7 days), to define their expected check-in/lunch/check-out times.

**AC:**
- [ ] `POST /api/v1/employment-periods/{id}/schedules` — creates schedule + 7 schedule_days in a single request
- [ ] Body includes `days[]` array with: day_of_week, is_day_off, expected_start, expected_lunch_end, expected_end
- [ ] Validation: if `is_day_off = false`, then `expected_start` is required
- [ ] On creation, closes the previous schedule's effective date (if one exists)
- [ ] Feature test: create full schedule, validations

---

### AP-009 · Query Current Schedule API
**Size:** S · **Priority:** P1 · **FR:** RF-08

> As a Manager, I want to query an employee's current schedule, to know their expected times.

**AC:**
- [ ] `GET /api/v1/employees/{id}/current-schedule` — returns current schedule + its 7 days
- [ ] 404 if no current schedule exists
- [ ] Response includes: workday type, effective date, days with their times
- [ ] Feature test

---

### AP-010 · Schedule History API
**Size:** S · **Priority:** P2 · **FR:** RF-09

> As an Admin, I want to view an employee's schedule history, to audit shift changes.

**AC:**
- [ ] `GET /api/v1/employment-periods/{id}/schedules` — lists all schedules (current and historical)
- [ ] Each schedule includes its 7 schedule_days
- [ ] Ordered by `effective_from` descending
- [ ] Feature test

---

### AP-011 · Update Current Schedule API
**Size:** S · **Priority:** P2 · **FR:** RF-08

> As an Admin, I want to update the times of a current schedule, to correct errors without creating a new one.

**AC:**
- [ ] `PUT /api/v1/schedules/{id}` — updates workday_type, working_days_per_week + days[]
- [ ] Can only edit if the schedule is current (effective_to IS NULL)
- [ ] Error 422 if attempting to edit a closed schedule
- [ ] Feature test

---

## E3 — Daily Attendance

### AP-012 · Attendance Migration & Model
**Size:** M · **Priority:** P0 · **FR:** RF-11, RF-12, RF-16

> As a developer, I want to create the migration and `Attendance` model, to store each employee's daily record.

**AC:**
- [ ] Migration creates `attendances` table with all domain model fields (check_in, check_out, lunch_start, lunch_end, entry_late_seconds, lunch_late_seconds, net_worked_minutes, overtime_minutes, overtime_authorized, overtime_authorized_by, overtime_authorized_at, day_status, confirmed_by, meta, timestamps)
- [ ] UNIQUE(employee_id, date), INDEX(date), INDEX(day_status)
- [ ] Enum `DayStatus`: WORKED, DAY_OFF, LEAVE, VACATION, HOLIDAY, ABSENCE, EXTRA
- [ ] Model with appropriate `$casts`, relationships: `belongsTo(Employee)`, scopes by status
- [ ] Unit tests

---

### AP-013 · Register Check-in API
**Size:** M · **Priority:** P0 · **FR:** RF-11, RF-13, RF-15a

> As a Manager, I want to register an employee's check-in time, so the system automatically calculates their tardiness.

**AC:**
- [ ] `POST /api/v1/attendances/check-in` — body: `{ employee_id, check_in (datetime) }`
- [ ] Creates `Attendance` record with `day_status = WORKED`
- [ ] Calculates `entry_late_seconds` = max(0, check_in − expected_start) using the current schedule
- [ ] If the employee already has an attendance for that date, error 422
- [ ] If no current schedule exists, error 422 with descriptive message
- [ ] Response includes: entry_late_seconds, is_deductible (> 1800s)
- [ ] Feature tests: on time, late <30min, late >30min, no schedule

---

### AP-014 · Register Lunch Return API
**Size:** S · **Priority:** P1 · **FR:** RF-14, RF-15a

> As a Manager, I want to register the lunch return time, to calculate tardiness on the return.

**AC:**
- [ ] `PATCH /api/v1/attendances/{id}/lunch-return` — body: `{ lunch_end (datetime) }`
- [ ] Calculates `lunch_late_seconds` = max(0, lunch_end − expected_lunch_end)
- [ ] Error 422 if no check_in is registered
- [ ] Error 422 if lunch_end is already registered
- [ ] Feature tests: on time, late <30min, late >30min

---

### AP-015 · Register Check-out API
**Size:** M · **Priority:** P0 · **FR:** RF-12, RF-14, RF-42

> As a Manager, I want to register the check-out time, so the system calculates worked hours and overtime.

**AC:**
- [ ] `PATCH /api/v1/attendances/{id}/check-out` — body: `{ check_out (datetime) }`
- [ ] Calculates `net_worked_minutes` (check_out − check_in − lunch_duration if applicable)
- [ ] Calculates `overtime_minutes` = max(0, check_out − expected_end) in minutes
- [ ] Error 422 if no check_in exists
- [ ] Response includes: net_worked_minutes, overtime_minutes, overtime_requires_decision (true if overtime_minutes > 0)
- [ ] Feature tests

---

### AP-016 · Authorize/Reject Overtime Payment API
**Size:** M · **Priority:** P1 · **FR:** RF-47a, RF-47b, DC-01

> As a Manager, I want to decide whether a day's overtime hours are paid or not, to control payroll expenses.

**AC:**
- [ ] `PATCH /api/v1/attendances/{id}/overtime-decision` — body: `{ authorize: true|false }`
- [ ] If `authorize = true`: sets `overtime_authorized = true`, records `overtime_authorized_by` and `overtime_authorized_at`
- [ ] If `authorize = false`: sets `overtime_authorized = false`
- [ ] Only works if `overtime_minutes > 0`
- [ ] Error 422 if a decision has already been made
- [ ] Feature tests: authorize, reject, no overtime

---

### AP-017 · Automatic Deductible Tardiness Calculation (>30 min)
**Size:** S · **Priority:** P1 · **FR:** RF-15b, RN-00

> As a system, I want to automatically flag tardiness >30 min as deductible, so the weekly close deducts them correctly.

**AC:**
- [ ] On check-in registration: if `entry_late_seconds > 1800`, the field is stored correctly for later deduction
- [ ] On lunch return registration: if `lunch_late_seconds > 1800`, the field is stored correctly
- [ ] The deduction amount is NOT calculated here (calculated at close time), only the evidence is recorded
- [ ] Unit test: method `isEntryLateDeductible()` and `isLunchLateDeductible()` return true when > 1800

---

### AP-018 · Query Today's Attendance API ("Today" view)
**Size:** M · **Priority:** P1 · **FR:** RF-48

> As a Manager, I want to see the list of employees with their attendance status for today, to operate the daily capture.

**AC:**
- [ ] `GET /api/v1/attendances/today?branch_id=` — returns list of active employees of the branch with their attendance for the day (or null if none)
- [ ] Each record includes: employee (name, role, code), check_in, check_out, lunch_end, day_status, entry_late_seconds, overtime_minutes
- [ ] Employees without attendance appear with implicit status "no record"
- [ ] Sorted by name
- [ ] Feature tests

---

### AP-019 · Mark Day Without Attendance API (day off/absence)
**Size:** S · **Priority:** P1 · **FR:** RF-16

> As a Manager, I want to mark a day as day off or absence for an employee, so the system records it without check-in/out.

**AC:**
- [ ] `POST /api/v1/attendances/day-status` — body: `{ employee_id, date, day_status: DAY_OFF|ABSENCE }`
- [ ] Creates `Attendance` record without check_in/check_out, only with day_status
- [ ] Error 422 if an attendance already exists for that date
- [ ] Feature tests

---

## E4 — Partial Leaves

### AP-020 · PartialLeave Migration & Model
**Size:** S · **Priority:** P0 · **FR:** RF-25a

> As a developer, I want to create the migration and `PartialLeave` model, to store partial leaves.

**AC:**
- [ ] Migration creates `partial_leaves` table per domain model
- [ ] Enum `PartialLeaveType`: ARRIVE_LATE, LEAVE_EARLY, TAKE_TIME
- [ ] Model with relationships: `belongsTo(Employee)`, `belongsTo(Attendance)`
- [ ] Validation: duration_minutes > 0
- [ ] Unit tests

---

### AP-021 · Register Partial Leave API
**Size:** M · **Priority:** P1 · **FR:** RF-25a, RN-00c

> As a Manager, I want to register a partial leave (arrive late, leave early, take time off), to document the absence and its payment type.

**AC:**
- [ ] `POST /api/v1/partial-leaves` — body: `{ employee_id, date, type, is_paid, start_time (opt), end_time (opt), duration_minutes, reason }`
- [ ] `approved_by` is taken from the authenticated user
- [ ] If attendance exists for that day, it is linked with `attendance_id`
- [ ] If `start_time` and `end_time` are provided, `duration_minutes` is calculated automatically
- [ ] Feature tests: paid, unpaid, with time window, duration only

---

### AP-022 · List Partial Leaves by Employee/Date API
**Size:** S · **Priority:** P1 · **FR:** RF-25a

> As a Manager, I want to query an employee's partial leaves within a date range, to review their history.

**AC:**
- [ ] `GET /api/v1/partial-leaves?employee_id=&date_from=&date_to=` — filtered list of leaves
- [ ] Includes: type, is_paid, duration_minutes, reason, approved_by (name)
- [ ] Pagination
- [ ] Feature tests

---

### AP-023 · Unpaid Leave Deduction Calculation
**Size:** S · **Priority:** P1 · **FR:** RF-25b, RN-00d

> As a system, I want unpaid leaves to calculate their exact minute-by-minute deduction, so the weekly close deducts them correctly.

**AC:**
- [ ] Method `deductionAmount(minuteRate)` in `PartialLeave` model: if `is_paid = false`, returns `duration_minutes * minuteRate`; if `is_paid = true`, returns 0
- [ ] Unit test: unpaid leave of 45 min with rate $2.08/min = $93.60 deduction
- [ ] Unit test: paid leave of 45 min = $0.00 deduction

---

## E5 — Punctuality & Bonuses

### AP-024 · PunctualityRange Migration & Model
**Size:** S · **Priority:** P0 · **FR:** RF-32

> As a developer, I want to create the migration, model, and seeder for `PunctualityRange`, to configure bonus ranges.

**AC:**
- [ ] Migration creates `punctuality_ranges` table: id, min_seconds, max_seconds (nullable), bonus_percentage (decimal 5,2), sort_order, timestamps
- [ ] Seeder inserts the 5 default SushiGo ranges (0-599=100%, 600-899=50%, 900-1259=25%, 1260-1559=10%, 1560+=0%)
- [ ] Model with method `matches(lateSeconds): bool`
- [ ] Unit tests: each range evaluates correctly, edge cases (599s, 600s)

---

### AP-025 · PunctualityBonusGroup + EmployeeBonusConfig Migration & Models
**Size:** S · **Priority:** P0 · **FR:** RF-33, RF-34

> As a developer, I want to create the bonus group models and their employee assignment, to support proration.

**AC:**
- [ ] Migration `punctuality_bonus_groups`: id, name, weekly_bonus_amount (decimal 10,2), working_days_divisor, is_active, timestamps
- [ ] Migration `employee_bonus_configs`: id, employee_id (FK), punctuality_bonus_group_id (FK), effective_from, effective_to (nullable), timestamps
- [ ] Seeder: Group $110 (÷6), Group $100 (÷6), Group $50 (÷3)
- [ ] Method `dailyBonusAmount()` in PunctualityBonusGroup = weekly / divisor
- [ ] Unit tests

---

### AP-026 · PunctualityException Migration & Model
**Size:** S · **Priority:** P1 · **FR:** RF-37

> As a developer, I want to create the punctuality exception model, to support cases like Andrea Mon/Wed/Thu = 0%.

**AC:**
- [ ] Migration `punctuality_exceptions`: id, employee_id (FK), day_of_week (nullable), forced_percentage (decimal 5,2), effective_from, effective_to (nullable), reason (nullable), timestamps
- [ ] Model with scope `effective(date)`, method `appliesToDay(dayOfWeek): bool`
- [ ] Unit tests

---

### AP-027 · Daily Punctuality Bonus Calculation Service
**Size:** M · **Priority:** P1 · **FR:** RF-34, RF-35, RN-01, RN-03, RN-04

> As a system, I want to calculate an employee's daily punctuality bonus, to accumulate their weekly bonus.

**AC:**
- [ ] `PunctualityService::calculateDailyBonus(employee, date, attendance)` returns the daily bonus amount
- [ ] Gets the employee's current bonus group → calculates dailyBonusAmount
- [ ] Gets the tardiness seconds from attendance → finds the matching range → gets percentage
- [ ] Checks exceptions: if there's an effective exception for that day → uses forced_percentage
- [ ] If day_status = DAY_OFF → returns 0 (RN-03)
- [ ] If day_status = EXTRA → returns 0 (RN-04)
- [ ] If day_status = ABSENCE → returns 0
- [ ] Result = dailyBonusAmount × percentage
- [ ] Tests: on time 100%, late 50%, day off, extra, with exception

---

### AP-028 · Weekly Punctuality Bonus Calculation Service
**Size:** S · **Priority:** P1 · **FR:** RF-34, RN-02

> As a system, I want to sum the daily bonuses for the week to get an employee's weekly bonus.

**AC:**
- [ ] `PunctualityService::calculateWeeklyBonus(employee, periodStart, periodEnd)` returns total bonus + daily breakdown
- [ ] Iterates the period days, calculates daily bonus for each, sums
- [ ] Also returns the daily bonus array (for evidence)
- [ ] Tests: full punctual week, week with days off, mixed week

---

### AP-029 · Free Hours for Punctuality Calculation Service
**Size:** S · **Priority:** P2 · **FR:** RF-36, RN-05, RN-06, RN-07, RN-08

> As a system, I want to calculate the free hours earned for punctual weeks, to include them in the close.

**AC:**
- [ ] `PunctualityService::calculateFreeHours(punctualDays, lastTwoDaysPunctual)` returns earned hours
- [ ] 6 punctual → 1.0h (weekend)
- [ ] 5 punctual → 1.0h (weekday)
- [ ] 4 punctual → 0.5h (weekday)
- [ ] < 4 punctual → 0h
- [ ] Validation: if the last 2 days of the period are NOT punctual → 0h (RN-08)
- [ ] Tests for each case

---

### AP-030 · Punctuality Configuration API
**Size:** M · **Priority:** P2 · **FR:** RF-32, RF-33, RF-37

> As an Admin, I want to manage punctuality ranges, bonus groups, and exceptions via API, to configure business rules.

**AC:**
- [ ] `GET /api/v1/punctuality/ranges` — list ranges
- [ ] `PUT /api/v1/punctuality/ranges` — update ranges (bulk update)
- [ ] `GET /api/v1/punctuality/bonus-groups` — list groups
- [ ] `POST /api/v1/punctuality/bonus-groups` — create group
- [ ] `POST /api/v1/employees/{id}/bonus-config` — assign group to employee
- [ ] `POST /api/v1/employees/{id}/punctuality-exceptions` — create exception
- [ ] `GET /api/v1/employees/{id}/punctuality-exceptions` — list exceptions
- [ ] Feature tests

---

## E6 — Negotiated Extra Days

### AP-031 · NegotiatedExtraDay Migration & Model
**Size:** S · **Priority:** P0 · **FR:** RF-38, RF-39

> As a developer, I want to create the migration and `NegotiatedExtraDay` model, to store negotiated extra days.

**AC:**
- [ ] Migration creates table per domain model, UNIQUE(employee_id, date)
- [ ] Model with relationships: belongsTo(Employee), belongsTo(Branch)
- [ ] Validation: agreed_pay > 0
- [ ] Unit tests

---

### AP-032 · Register Negotiated Extra Day API
**Size:** S · **Priority:** P1 · **FR:** RF-38, RF-39, RN-09

> As a Manager, I want to register a negotiated extra day for an employee, to document the payment agreement.

**AC:**
- [ ] `POST /api/v1/negotiated-extra-days` — body: `{ employee_id, date, branch_id, agreed_pay, notes }`
- [ ] `approved_by` is taken from the authenticated user
- [ ] Creates/updates attendance for the day with `day_status = EXTRA`
- [ ] Error 422 if an extra already exists for that employee/date
- [ ] Feature tests

---

### AP-033 · List Negotiated Extra Days API
**Size:** S · **Priority:** P2 · **FR:** RF-39

> As a Manager, I want to query an employee's or period's negotiated extra days, to review agreements.

**AC:**
- [ ] `GET /api/v1/negotiated-extra-days?employee_id=&date_from=&date_to=` — filtered list
- [ ] Includes: employee, date, agreed pay, approved by, notes
- [ ] Feature tests

---

## E7 — Overtime Bank

### AP-034 · OvertimeBankMovement Migration & Model
**Size:** S · **Priority:** P0 · **FR:** RF-42, RF-44, RF-45

> As a developer, I want to create the migration and `OvertimeBankMovement` model, to record overtime bank movements.

**AC:**
- [ ] Migration creates table per domain model
- [ ] Enums: OvertimeMovementType (EARNED|USED|PAID|ADJUSTMENT), OvertimeOrigin (AUTO|MANUAL), OvertimeValuationMethod (LFT_PROPORTIONAL|AGREED_RATE)
- [ ] Model with relationships and method `balanceImpact()`: EARNED = +minutes, USED/PAID = −minutes, ADJUSTMENT = ±minutes
- [ ] Unit tests

---

### AP-035 · OvertimePayConfig Migration & Model
**Size:** S · **Priority:** P0 · **FR:** RF-47c, DC-03

> As a developer, I want to create the migration and `OvertimePayConfig` model, to configure how overtime is paid per employee.

**AC:**
- [ ] Migration creates table per domain model
- [ ] Model with scope `effective(date)`, method `calculatePay(minutes, dailyWage): decimal`
- [ ] For LFT_PROPORTIONAL: (dailyWage / 8 / 60) × lft_factor × minutes
- [ ] For AGREED_RATE: (hourly_rate / 60) × minutes
- [ ] Unit tests: both methods with real-world cases

---

### AP-036 · Automatic Overtime Generation on Check-out Service
**Size:** M · **Priority:** P1 · **FR:** RF-42, RF-43, RF-47a

> As a system, I want to automatically generate an EARNED movement in the overtime bank when check-out is registered with overtime, to keep the bank updated.

**AC:**
- [ ] On check-out registration (AP-015), if `overtime_minutes > 0`, create `OvertimeBankMovement` type EARNED, origin AUTO
- [ ] The movement references the attendance_id
- [ ] If the Manager authorizes payment (AP-016), create PAID movement with valuation_method, applied_rate, amount calculated from OvertimePayConfig
- [ ] If not authorized, the EARNED remains as historical
- [ ] Tests: checkout with overtime → EARNED created; authorization → PAID created with correct calculation

---

### AP-037 · Configure Overtime Payment per Employee API
**Size:** S · **Priority:** P1 · **FR:** RF-47c, DC-03

> As an Admin, I want to configure the overtime payment method for each employee, to define if it's paid by LFT or agreed rate.

**AC:**
- [ ] `POST /api/v1/employees/{id}/overtime-config` — body: `{ method, hourly_rate (if AGREED_RATE), lft_factor (if LFT_PROPORTIONAL), effective_from }`
- [ ] On creation, closes the previous config's effective date
- [ ] `GET /api/v1/employees/{id}/overtime-config` — returns current config + history
- [ ] Feature tests

---

### AP-038 · Query Overtime Bank Balance & Movements API
**Size:** S · **Priority:** P2 · **FR:** RF-46

> As a Manager, I want to query an employee's overtime bank balance and movements, to see their accumulated balance.

**AC:**
- [ ] `GET /api/v1/employees/{id}/overtime-bank` — returns balance (sum of balanceImpact of all movements)
- [ ] `GET /api/v1/employees/{id}/overtime-bank/movements?date_from=&date_to=` — list movements
- [ ] Balance = Σ(EARNED.minutes) − Σ(USED.minutes) − Σ(PAID.minutes) ± Σ(ADJUSTMENT.minutes)
- [ ] Feature tests

---

### AP-039 · Register Manual Overtime Bank Movement API
**Size:** S · **Priority:** P2 · **FR:** RF-43, RF-44

> As an Admin, I want to register a manual movement (USED or ADJUSTMENT) in the bank, to redeem time or correct balances.

**AC:**
- [ ] `POST /api/v1/employees/{id}/overtime-bank/movements` — body: `{ date, minutes, movement_type (USED|ADJUSTMENT), reason }`
- [ ] origin = MANUAL, authorized_by = authenticated user
- [ ] Validation: if USED, the resulting balance cannot be negative
- [ ] Feature tests

---

## E8 — Weekly Close (Payroll)

### AP-040 · PayPeriod + PayPeriodEmployee + PayPeriodLine Migrations & Models
**Size:** M · **Priority:** P0 · **FR:** RF-20

> As a developer, I want to create the weekly close migrations and models, to store the payroll snapshot.

**AC:**
- [ ] Migration `pay_periods` per domain model, UNIQUE(branch_id, period_start, period_end)
- [ ] Migration `pay_period_employees` per domain model, UNIQUE(pay_period_id, employee_id)
- [ ] Migration `pay_period_lines` per domain model
- [ ] Enum PayPeriodStatus: OPEN, CLOSED, REOPENED
- [ ] Enum PayConcept: BASE_PAY, LATE_DEDUCTION, UNPAID_LEAVE, OVERTIME, EXTRA_DAY, PUNCTUALITY_BONUS, HOLIDAY, OTHER
- [ ] Models with relationships and methods: `isOpen()`, `isClosed()`, `calculateTotal()`
- [ ] Unit tests

---

### AP-041 · Period Base Pay Calculation Service
**Size:** S · **Priority:** P1 · **FR:** RF-22, RF-23

> As a system, I want to calculate an employee's base pay for a period, to use it as the close basis.

**AC:**
- [ ] `PayrollCalculator::calculateBasePay(employee, periodStart, periodEnd)` returns decimal
- [ ] Gets the effective wage (hourly_rate) for the period
- [ ] Counts worked days (status = WORKED) in the range and their scheduled hours
- [ ] base_pay = hourly_rate × total scheduled hours of worked days
- [ ] Tests: full week (6 days), week with absences, week with days off

---

### AP-042 · Tardiness Deductions Calculation Service
**Size:** S · **Priority:** P1 · **FR:** RF-15b, RN-00

> As a system, I want to calculate the total tardiness deductions >30 min for the period, to include them in the close.

**AC:**
- [ ] `PayrollCalculator::calculateLateDeductions(attendances, minuteRate)` returns decimal
- [ ] Filters attendances where `entry_late_seconds > 1800` → converts to minutes (floor) → multiplies by minuteRate
- [ ] Filters attendances where `lunch_late_seconds > 1800` → same logic
- [ ] Sums both
- [ ] Tests: no tardiness, one late entry, one late return, both in one day

---

### AP-043 · Unpaid Leave Deductions Calculation Service
**Size:** S · **Priority:** P1 · **FR:** RF-25b, RN-00d

> As a system, I want to calculate the total unpaid leave deductions for the period.

**AC:**
- [ ] `PayrollCalculator::calculateUnpaidLeaveDeductions(partialLeaves, minuteRate)` returns decimal
- [ ] Filters leaves where `is_paid = false` → sums `duration_minutes × minuteRate`
- [ ] Paid leaves → $0
- [ ] Tests: no leaves, 1 unpaid, mixed

---

### AP-044 · Complete Period Calculation Service (PayrollCalculator)
**Size:** L · **Priority:** P1 · **FR:** RF-20, RF-49

> As a system, I want to orchestrate the complete calculation for a period for an employee, to generate the snapshot with all concepts.

**AC:**
- [ ] `PayrollCalculator::calculateEmployee(employee, periodStart, periodEnd)` returns array with all concepts
- [ ] Invokes: calculateBasePay, calculateLateDeductions, calculateUnpaidLeaveDeductions, calculateOvertimePay (sum of PAID movements), calculateExtraDayPay (sum of agreed_pay), calculateWeeklyBonus (via PunctualityService), calculateFreeHours
- [ ] Calculates total_pay with formula: base − deductions + extras + bonuses
- [ ] Generates daily_snapshot array with evidence per day
- [ ] Generates pay_period_lines array with each concept per day
- [ ] Tests: complete case with all concepts

---

### AP-045 · Weekly Close Preview API
**Size:** M · **Priority:** P1 · **FR:** RF-20, RF-49

> As a Manager, I want to see a preview of the weekly close before confirming it, to verify totals.

**AC:**
- [ ] `GET /api/v1/pay-periods/preview?branch_id=&period_start=&period_end=` — returns preview without persisting
- [ ] Executes PayrollCalculator for each active employee of the branch in the period
- [ ] Response: array of employees with { base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, total_pay, daily_evidence[] }
- [ ] Feature tests

---

### AP-046 · Confirm Weekly Close (freeze) API
**Size:** M · **Priority:** P1 · **FR:** RF-20, RN-16

> As a Manager, I want to confirm the weekly close, to freeze the results so they cannot be modified.

**AC:**
- [ ] `POST /api/v1/pay-periods` — body: `{ branch_id, period_start, period_end }`
- [ ] Executes PayrollCalculator for all employees
- [ ] Creates `PayPeriod` with status = CLOSED, closed_by, closed_at
- [ ] Creates `PayPeriodEmployee` per employee with snapshot of all fields
- [ ] Creates `PayPeriodLine` per concept/day
- [ ] Error 422 if a closed period already exists for that range
- [ ] Feature tests: successful close, duplicate close

---

### AP-047 · Reopen Period (Admin + audit) API
**Size:** S · **Priority:** P2 · **FR:** RF-21, RN-17

> As an Admin, I want to reopen a closed period to correct errors, leaving an audit trail.

**AC:**
- [ ] `PATCH /api/v1/pay-periods/{id}/reopen` — body: `{ reason }`
- [ ] Changes status to REOPENED, records reopened_by, reopened_at, reopen_reason
- [ ] Only Admin can execute
- [ ] `PATCH /api/v1/pay-periods/{id}/reclose` — recalculates and closes again
- [ ] Audit log is created for the reopening
- [ ] Feature tests: reopen, reclose, non-admin rejected

---

## E9 — Leaves (Full Day)

### AP-048 · LeaveType Migration & Model
**Size:** S · **Priority:** P1 · **FR:** RF-24

> As a developer, I want to create the migration, model, and seeder for `LeaveType`, to have the leave type catalog.

**AC:**
- [ ] Migration creates table per domain model, UNIQUE(code)
- [ ] Seeder with base types: MEDICAL (paid), PERSONAL (unpaid), FAMILY_EMERGENCY (paid)
- [ ] Unit tests

---

### AP-049 · Leave Migration & Model
**Size:** S · **Priority:** P1 · **FR:** RF-25

> As a developer, I want to create the migration and `Leave` model, to store full-day or range leaves.

**AC:**
- [ ] Migration creates table per domain model
- [ ] Enum LeaveStatus: PENDING, APPROVED, REJECTED, CANCELLED
- [ ] Model with relationships and scopes: `pending()`, `approved()`
- [ ] Unit tests

---

### AP-050 · Register and Approve Leave API
**Size:** M · **Priority:** P2 · **FR:** RF-25

> As a Manager, I want to register a full-day leave for an employee and approve it, so it's reflected in their attendance.

**AC:**
- [ ] `POST /api/v1/leaves` — body: `{ employee_id, leave_type_id, start_date, end_date, notes }`
- [ ] Created with status = PENDING
- [ ] `PATCH /api/v1/leaves/{id}/approve` — approves (approved_by, approved_at)
- [ ] `PATCH /api/v1/leaves/{id}/reject` — rejects
- [ ] On approval, creates/updates attendance for affected days with `day_status = LEAVE`
- [ ] Feature tests

---

### AP-051 · List Leaves API
**Size:** S · **Priority:** P2 · **FR:** RF-25

> As a Manager, I want to query an employee's leaves, to review their history.

**AC:**
- [ ] `GET /api/v1/leaves?employee_id=&status=&date_from=&date_to=` — list with filters
- [ ] Includes: leave type (name, is_paid), dates, status, approved by
- [ ] Feature tests

---

## E10 — Vacations

### AP-052 · VacationEntitlement + VacationRequest Migrations & Models
**Size:** S · **Priority:** P1 · **FR:** RF-26, RF-27

> As a developer, I want to create the vacation migrations and models, to manage entitlements and requests.

**AC:**
- [ ] Migration `vacation_entitlements` per domain model, UNIQUE(employee_id, year)
- [ ] Migration `vacation_requests` per domain model
- [ ] Models with relationships and computed `remainingDays()`
- [ ] Unit tests

---

### AP-053 · Manage Vacation Entitlement API
**Size:** S · **Priority:** P2 · **FR:** RF-26

> As an Admin, I want to register an employee's annual vacation entitlement per LFT, to control their balance.

**AC:**
- [ ] `POST /api/v1/employees/{id}/vacation-entitlements` — body: `{ year, entitled_days }`
- [ ] `GET /api/v1/employees/{id}/vacation-entitlements` — history by year with remaining
- [ ] Error 422 if a record already exists for that year
- [ ] Feature tests

---

### AP-054 · Request and Approve Vacations API
**Size:** M · **Priority:** P2 · **FR:** RF-27, RF-28

> As a Manager, I want to request vacations for an employee and approve them, so attendance capture is blocked.

**AC:**
- [ ] `POST /api/v1/vacation-requests` — body: `{ employee_id, start_date, end_date }`
- [ ] Automatically calculates `days_count` (excluding Sundays if applicable or days off per schedule)
- [ ] Validates sufficient balance (entitled − used ≥ days_count)
- [ ] `PATCH /api/v1/vacation-requests/{id}/approve` — approves: updates used_days, creates attendances with status VACATION
- [ ] `PATCH /api/v1/vacation-requests/{id}/reject` — rejects
- [ ] RF-28: if attempting to register check-in on an approved vacation day → error 422
- [ ] Feature tests

---

### AP-055 · List Vacation Requests API
**Size:** S · **Priority:** P2 · **FR:** RF-27

> As a Manager, I want to query an employee's vacation requests.

**AC:**
- [ ] `GET /api/v1/vacation-requests?employee_id=&status=` — list with filters
- [ ] Includes: dates, days_count, status, approved by
- [ ] Feature tests

---

## E11 — Holidays

### AP-056 · Holiday Migration & Model
**Size:** S · **Priority:** P1 · **FR:** RF-29

> As a developer, I want to create the migration, model, and seeder for `Holiday`, to have the holiday catalog.

**AC:**
- [ ] Migration creates table per domain model, UNIQUE(date)
- [ ] Seeder with official MX 2026 holidays (New Year, Constitution Day, Benito Juárez, Labor Day, Independence Day, Revolution Day, Christmas)
- [ ] Unit tests

---

### AP-057 · Holiday CRUD API
**Size:** S · **Priority:** P2 · **FR:** RF-29, RF-30

> As an Admin, I want to manage the holiday catalog, to define which days apply a pay multiplier.

**AC:**
- [ ] `POST /api/v1/holidays` — body: `{ date, name, pay_multiplier }`
- [ ] `GET /api/v1/holidays?year=` — list holidays for the year
- [ ] `PUT /api/v1/holidays/{id}` — update
- [ ] `DELETE /api/v1/holidays/{id}` — delete
- [ ] Feature tests

---

### AP-058 · Holiday Worked Pay Calculation
**Size:** S · **Priority:** P2 · **FR:** RF-31

> As a system, I want to calculate the extra pay when an employee works on a holiday, to include it in the close.

**AC:**
- [ ] `PayrollCalculator::calculateHolidayPay(attendances, holidays, dailyWage)` returns decimal
- [ ] If attendance.date is in holidays AND day_status = WORKED → extra_pay = dailyWage × (pay_multiplier − 1)
- [ ] If not worked (DAY_OFF) → normal pay, no extra
- [ ] Tests: worked double holiday, worked triple holiday, did not work holiday

---

## E12 — Reports & Exports

### AP-059 · "Today" Report API (operational view)
**Size:** M · **Priority:** P1 · **FR:** RF-48

> As a Manager, I want a consolidated view of today showing each employee's status (arrived/not arrived/late/overtime), for daily operations.

**AC:**
- [ ] `GET /api/v1/reports/today?branch_id=` — returns today's summary
- [ ] Per employee: name, code, role, status (arrived, not_arrived, late, day_off, on_leave), check_in_time, late_minutes, has_overtime
- [ ] Totals: total_employees, arrived, not_arrived, late_count
- [ ] Feature tests

---

### AP-060 · Weekly Summary Report per Employee API
**Size:** M · **Priority:** P1 · **FR:** RF-49

> As a Manager, I want to query an employee's weekly summary with full breakdown, to review before closing.

**AC:**
- [ ] `GET /api/v1/reports/weekly-summary?employee_id=&period_start=&period_end=` — returns breakdown
- [ ] Includes: base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, holiday_pay, total_pay
- [ ] Includes daily table: date, check_in, check_out, lunch_end, day_status, late_minutes, deducted_minutes, partial_leaves[], overtime_minutes, overtime_paid
- [ ] If a closed period exists, returns from snapshot; otherwise, calculates live
- [ ] Feature tests

---

### AP-061 · Query Closed Period API
**Size:** S · **Priority:** P1 · **FR:** RF-20

> As a Manager, I want to query data from a closed period, to see the frozen results.

**AC:**
- [ ] `GET /api/v1/pay-periods/{id}` — returns period + employees + lines
- [ ] `GET /api/v1/pay-periods?branch_id=&status=` — list periods
- [ ] Includes totals per employee and breakdown by concept/day
- [ ] Feature tests

---

### AP-062 · Export Close to CSV
**Size:** M · **Priority:** P2 · **FR:** RF-50

> As an Admin, I want to export the weekly close to CSV, to process it in spreadsheets.

**AC:**
- [ ] `GET /api/v1/pay-periods/{id}/export?format=csv` — downloads CSV
- [ ] Format: one row per employee, columns: code, name, base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, holiday_pay, total_pay
- [ ] UTF-8 BOM headers for Excel compatibility
- [ ] Feature tests

---

### AP-063 · Export Close to PDF
**Size:** M · **Priority:** P3 · **FR:** RF-50

> As an Admin, I want to export the weekly close to PDF with full breakdown, for filing and signatures.

**AC:**
- [ ] `GET /api/v1/pay-periods/{id}/export?format=pdf` — downloads PDF
- [ ] Includes: header (branch, period, close date), summary table per employee, daily evidence table per employee
- [ ] Generated with PDF library (dompdf or similar)
- [ ] Feature tests

---

## E13 — Audit & Permissions

### AP-064 · AttendanceAuditLog Migration & Model
**Size:** S · **Priority:** P0 · **FR:** RF-19

> As a developer, I want to create the audit migration and model, to record all changes to attendance data.

**AC:**
- [ ] Migration creates table per domain model
- [ ] Enum AuditAction: CREATE, UPDATE, DELETE
- [ ] Model with polymorphic relationship (auditable_type/auditable_id)
- [ ] INDEX(auditable_type, auditable_id)
- [ ] Unit tests

---

### AP-065 · Automatic Audit Trait
**Size:** M · **Priority:** P1 · **FR:** RF-19

> As a developer, I want a trait that automatically records changes in auditable models, to avoid repeating logic.

**AC:**
- [ ] Trait `Auditable` added to models (Attendance, PartialLeave, NegotiatedExtraDay, etc.)
- [ ] On create: records CREATE with new_values
- [ ] On update: records UPDATE with old_values and new_values (only changed fields)
- [ ] On delete: records DELETE with old_values
- [ ] user_id is taken from the authenticated user
- [ ] Tests: create attendance → audit log created; update → log with diff

---

### AP-066 · Edit Restriction: Manager Only Current Day
**Size:** S · **Priority:** P1 · **FR:** RF-17

> As a system, I want to prevent a Manager from editing attendance records from previous days, to protect data integrity.

**AC:**
- [ ] Middleware/Policy: if user is Manager and the attendance date ≠ today → 403
- [ ] Check-in, check-out, lunch-return, day-status endpoints verify this rule
- [ ] Feature tests: Manager edits today → OK; Manager edits yesterday → 403

---

### AP-067 · Historical Edit for Admin (with reason)
**Size:** S · **Priority:** P1 · **FR:** RF-18, RF-19

> As an Admin, I want to be able to edit attendance records from previous days by providing a justification, to correct errors.

**AC:**
- [ ] Admin can edit any date
- [ ] Request requires `reason` field when date < today
- [ ] Audit log records the provided reason
- [ ] Feature tests: Admin edits yesterday with reason → OK + audit; Admin edits yesterday without reason → 422

---

### AP-068 · Query Audit Log API
**Size:** S · **Priority:** P2 · **FR:** RF-19, RF-50

> As an Admin, I want to query the change history of an attendance record, to audit modifications.

**AC:**
- [ ] `GET /api/v1/audit-logs?auditable_type=&auditable_id=` — list changes for a record
- [ ] `GET /api/v1/audit-logs?employee_id=&date_from=&date_to=` — changes by employee/range
- [ ] Includes: action, before/after values, user, date, reason
- [ ] Pagination
- [ ] Feature tests

---

## Dependency Matrix

```
AP-001 ──→ AP-002
  │
  ├──→ AP-003 ──→ AP-004
  │     │
  │     └──→ AP-007 ──→ AP-008 ──→ AP-009
  │
  ├──→ AP-005 ──→ AP-006
  │
  ├──→ AP-012 ──→ AP-013 ──→ AP-014
  │     │         │          │
  │     │         ├──→ AP-015 ──→ AP-016
  │     │         │                │
  │     │         └──→ AP-017      └──→ AP-036
  │     │                              │
  │     └──→ AP-018                    └──→ AP-034 ──→ AP-035 ──→ AP-037
  │          │
  │          └──→ AP-019
  │
  ├──→ AP-020 ──→ AP-021 ──→ AP-022
  │                │
  │                └──→ AP-023
  │
  ├──→ AP-024 ──→ AP-025 ──→ AP-026 ──→ AP-027 ──→ AP-028 ──→ AP-029
  │
  ├──→ AP-031 ──→ AP-032 ──→ AP-033
  │
  ├──→ AP-040 ──→ AP-041 ──→ AP-042 ──→ AP-043 ──→ AP-044 ──→ AP-045 ──→ AP-046 ──→ AP-047
  │
  ├──→ AP-048 ──→ AP-049 ──→ AP-050 ──→ AP-051
  │
  ├──→ AP-052 ──→ AP-053 ──→ AP-054 ──→ AP-055
  │
  ├──→ AP-056 ──→ AP-057 ──→ AP-058
  │
  └──→ AP-064 ──→ AP-065 ──→ AP-066 ──→ AP-067 ──→ AP-068
```

---

## Suggested Sprints — Vertical Slices (1 user action per task)

> Each task (#087–#118) in `doc/tasks/backlog/` delivers one complete user action:
> backend (migration if needed + API) + frontend (UI for that action).
> No task ships backend-only or frontend-only code.

### Sprint 1 — Schedule Management + Today View
| Task | User Action                           | Size |
| ---- | ------------------------------------- | ---- |
| #087 | Create weekly schedule                | M    |
| #088 | View current schedule                 | S    |
| #091 | Today view + Authorize overtime       | M    |
| #092 | Mark day as day-off or absence        | S    |

### Sprint 2 — Partial Leaves + Extra Days + Schedule extras
| Task | User Action                           | Size |
| ---- | ------------------------------------- | ---- |
| #093 | Register partial leave                | M    |
| #094 | View partial leave history            | S    |
| #095 | Register negotiated extra day         | M    |
| #096 | View extra days list                  | S    |
| #089 | Update current schedule               | S    |
| #090 | View schedule history                 | S    |

### Sprint 3 — Punctuality Configuration + Reports
| Task | User Action                           | Size |
| ---- | ------------------------------------- | ---- |
| #097 | Configure punctuality ranges          | M    |
| #098 | Configure bonus groups                | M    |
| #099 | Assign bonus group to employee        | M    |
| #100 | Manage punctuality exceptions         | M    |
| #101 | View today's operational report       | M    |
| #102 | View weekly summary report            | L    |

### Sprint 4 — Overtime Bank + Payroll Close
| Task | User Action                           | Size |
| ---- | ------------------------------------- | ---- |
| #103 | Configure overtime payment per employee | M  |
| #104 | View overtime bank balance            | M    |
| #105 | Register manual overtime movement     | S    |
| #106 | Preview weekly payroll close          | L    |
| #107 | Confirm weekly close                  | M    |
| #108 | View closed period detail             | M    |

### Sprint 5 — Leaves + Holidays + Vacations
| Task | User Action                           | Size |
| ---- | ------------------------------------- | ---- |
| #109 | Export closed period to CSV           | S    |
| #110 | Reopen closed period                  | M    |
| #111 | Register a full-day leave             | M    |
| #112 | Approve or reject a leave             | M    |
| #113 | View leave history                    | S    |
| #114 | Manage holiday catalog                | M    |
| #115 | Register vacation entitlement         | M    |
| #116 | Request and approve vacations         | M    |

### Sprint 6 — Permissions + Audit
| Task | User Action                           | Size |
| ---- | ------------------------------------- | ---- |
| #117 | Attendance edit permissions           | M    |
| #118 | View attendance audit log             | M    |

---

> **Deprecated sprints** (below) kept for historical reference — the fine-grained
> API-only and migration-only stories have been replaced by the vertical-slice
> tasks above.

### [Legacy] Sprint 5 — Overtime Bank + Weekly Close
| ID     | Story                                       | Size | Prio |
| ------ | ------------------------------------------- | ---- | ---- |
| AP-034 | OvertimeBankMovement Migration & Model      | S    | P0   |
| AP-035 | OvertimePayConfig Migration & Model         | S    | P0   |
| AP-036 | Automatic Overtime Generation Service       | M    | P1   |
| AP-037 | Configure Overtime Payment API              | S    | P1   |
| AP-040 | PayPeriod Models Migrations                 | M    | P0   |
| AP-041 | Base Pay Calculation Service                | S    | P1   |
| AP-042 | Tardiness Deductions Calculation Service    | S    | P1   |
| AP-043 | Unpaid Leave Deductions Calculation Service | S    | P1   |

### Sprint 6 — Complete Close Engine
| ID     | Story                                            | Size | Prio |
| ------ | ------------------------------------------------ | ---- | ---- |
| AP-044 | Complete Calculation Service (PayrollCalculator) | L    | P1   |
| AP-045 | Weekly Close Preview API                         | M    | P1   |
| AP-046 | Confirm Close (freeze) API                       | M    | P1   |
| AP-059 | "Today" Report API                               | M    | P1   |
| AP-060 | Weekly Summary Report API                        | M    | P1   |
| AP-061 | Query Closed Period API                          | S    | P1   |
| AP-066 | Manager Edit Restriction (today only)            | S    | P1   |
| AP-067 | Admin Historical Edit with Reason                | S    | P1   |

### Sprint 7 — Complete MVP + Post-MVP
| ID     | Story                             | Size | Prio |
| ------ | --------------------------------- | ---- | ---- |
| AP-029 | Free Hours Calculation Service    | S    | P2   |
| AP-030 | Punctuality Configuration API     | M    | P2   |
| AP-033 | List Negotiated Extra Days API    | S    | P2   |
| AP-038 | Overtime Bank Balance API         | S    | P2   |
| AP-039 | Manual Overtime Bank Movement API | S    | P2   |
| AP-047 | Reopen Period API                 | S    | P2   |
| AP-048 | LeaveType Migration & Model       | S    | P1   |
| AP-049 | Leave Migration & Model           | S    | P1   |
| AP-050 | Register and Approve Leave API    | M    | P2   |
| AP-056 | Holiday Migration & Model         | S    | P1   |

### Sprint 8 — Vacations, Holidays, Exports
| ID     | Story                             | Size | Prio |
| ------ | --------------------------------- | ---- | ---- |
| AP-010 | Schedule History API              | S    | P2   |
| AP-011 | Update Current Schedule API       | S    | P2   |
| AP-051 | List Leaves API                   | S    | P2   |
| AP-052 | Vacation Migrations               | S    | P1   |
| AP-053 | Vacation Entitlement API          | S    | P2   |
| AP-054 | Request and Approve Vacations API | M    | P2   |
| AP-055 | List Vacation Requests API        | S    | P2   |
| AP-057 | Holiday CRUD API                  | S    | P2   |
| AP-058 | Holiday Worked Pay Calculation    | S    | P2   |
| AP-062 | Export Close to CSV               | M    | P2   |
| AP-068 | Query Audit Log API               | S    | P2   |

### Sprint 9 (Post-MVP)
| ID     | Story               | Size | Prio |
| ------ | ------------------- | ---- | ---- |
| AP-063 | Export Close to PDF | M    | P3   |

---

## FR → Stories Traceability

| FR                                | Stories                                                |
| --------------------------------- | ------------------------------------------------------ |
| RF-01, RF-02                      | AP-001, AP-002                                         |
| RF-03                             | AP-003, AP-004                                         |
| RF-04                             | AP-060                                                 |
| RF-05, RF-06, RF-07               | AP-003, AP-004                                         |
| RF-08, RF-09, RF-10               | AP-007, AP-008, AP-009, AP-010, AP-011                 |
| RF-11                             | AP-012, AP-013                                         |
| RF-12                             | AP-012, AP-015                                         |
| RF-13                             | AP-013, AP-017                                         |
| RF-14                             | AP-014, AP-015                                         |
| RF-15, RF-15a, RF-15b             | AP-013, AP-014, AP-017                                 |
| RF-16                             | AP-012, AP-019                                         |
| RF-17                             | AP-066                                                 |
| RF-18                             | AP-067                                                 |
| RF-19                             | AP-064, AP-065, AP-067, AP-068                         |
| RF-20                             | AP-040, AP-046, AP-061                                 |
| RF-21                             | AP-047                                                 |
| RF-22, RF-23                      | AP-005, AP-006, AP-041                                 |
| RF-24                             | AP-048                                                 |
| RF-25, RF-25a, RF-25b, RF-25c     | AP-020, AP-021, AP-022, AP-023, AP-049, AP-050, AP-051 |
| RF-26                             | AP-052, AP-053                                         |
| RF-27, RF-28                      | AP-054, AP-055                                         |
| RF-29, RF-30, RF-31               | AP-056, AP-057, AP-058                                 |
| RF-32                             | AP-024, AP-030                                         |
| RF-33, RF-34                      | AP-025, AP-030                                         |
| RF-35                             | AP-027                                                 |
| RF-36                             | AP-029                                                 |
| RF-37                             | AP-026, AP-030                                         |
| RF-38, RF-39, RF-40, RF-41        | AP-031, AP-032, AP-033                                 |
| RF-42, RF-43, RF-44, RF-45, RF-46 | AP-034, AP-036, AP-038, AP-039                         |
| RF-47, RF-47a, RF-47b, RF-47c     | AP-016, AP-035, AP-036, AP-037                         |
| RF-48                             | AP-018, AP-059                                         |
| RF-49                             | AP-044, AP-045, AP-060                                 |
| RF-50                             | AP-062, AP-063, AP-068                                 |

---

> **68 stories** · **13 epics** · **~8 MVP sprints** + 1 post-MVP
> Coverage: 100% of FRs (RF-01 to RF-50), BRs, and DCs from spec v0.8
