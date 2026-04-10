# 🏥 Task #077: Register Direct Absence — Today View

## 📖 Story

**English:**
As a Manager, I want to register an employee's absence directly from the Today view — either because the employee didn't show up or because we already reached a verbal agreement — so the attendance record is updated immediately without requiring a prior request.

**Español:**
Como Manager, quiero registrar una ausencia de un empleado directamente desde la vista de hoy — ya sea porque no se presentó o porque ya llegamos a un acuerdo verbal — para que el registro de asistencia se actualice de inmediato sin necesidad de una solicitud previa.

---

## 🧠 Key Design Decisions

- **Direct registration = APPROVED immediately.** No PENDING state. The manager owns the decision.
- On save: creates or updates the `Attendance` record for that date with `day_status = LEAVE`.
- Check-in is blocked if an APPROVED leave already exists for that date.
- `pay_percentage` and `rest_day_factor` pre-fill from the selected leave type but are editable.
- For `PROPORTIONAL_HOURS` leaves: `actual_start_time` / `actual_end_time` can be filled on the form (if hours are known) or updated live from Today view as the employee departs/returns.

---

## ✅ Backend Tasks

- [x] 📂 Migration `create_leave_types_table`
  - `code` varchar(30) UK, `name` varchar(100)
  - `calculation_mode` enum(`FIXED_PERCENTAGE`, `PROPORTIONAL_HOURS`) default `FIXED_PERCENTAGE`
  - `default_pay_percentage` decimal(5,2) default 100.00
  - `default_rest_day_factor` enum(`FULL`, `PROPORTIONAL`, `NONE`) default `PROPORTIONAL`
  - `counts_for_bonus` bool default true, `is_active` bool default true, timestamps
- [x] 📂 Migration `create_leaves_table`
  - `employee_id` FK, `leave_type_id` FK
  - `start_date` date, `end_date` date
  - `pay_percentage` decimal(5,2) nullable, `rest_day_factor` enum nullable
  - `time_mode` enum(`SCHEDULED`, `OPEN_ENDED`) nullable
  - `scheduled_start_time` time nullable, `scheduled_end_time` time nullable
  - `actual_start_time` time nullable, `actual_end_time` time nullable
  - `actual_duration_minutes` int nullable
  - `status` enum(`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`) default `PENDING`
  - `requested_by` FK, `approved_by` FK nullable, `approved_at` datetime nullable
  - `notes` text nullable, timestamps
- [x] 🌱 Seeder `LeaveTypeSeeder` (OnceSeeder) with default types:

  | code | name | calculation_mode | default_pay_% | default_rest_day_factor |
  |---|---|---|---|---|
  | `MEDICAL` | Incapacidad médica | `FIXED_PERCENTAGE` | 0.00 | `NONE` |
  | `PERSONAL` | Permiso personal | `FIXED_PERCENTAGE` | 0.00 | `NONE` |
  | `PERMISSION_PAID` | Permiso con goce | `FIXED_PERCENTAGE` | 100.00 | `FULL` |
  | `PERMISSION_HOURS` | Permiso por horas | `PROPORTIONAL_HOURS` | — | `PROPORTIONAL` |

- [x] 🔧 `LeaveType` model — `resolvedPayPercentage()`, `resolvedRestDayFactor(override)`
- [x] 🔧 `Leave` model — `belongsTo(Employee)`, `belongsTo(LeaveType)`, scopes `approved()`, `forDate(date)`; method `computedDurationMinutes()` (actual ?? scheduled)
- [x] 🌐 `POST /api/v1/leaves` — `RegisterDirectLeaveController`:
  - Accepts: `employee_id`, `leave_type_id`, `start_date`, `end_date`, `pay_percentage?`, `rest_day_factor?`, `time_mode?`, `scheduled_start_time?`, `scheduled_end_time?`, `actual_start_time?`, `actual_end_time?`, `notes?`
  - Validates: `time_mode` required when `calculation_mode = PROPORTIONAL_HOURS`; `scheduled_start_time` required when `time_mode` set; `scheduled_end_time` required only when `time_mode = SCHEDULED`
  - Sets `status = APPROVED`, `approved_by = auth()->id()`, `approved_at = now()`
  - Creates/updates `Attendance` record for each date with `day_status = LEAVE`
- [x] 🔧 Check-in endpoint (existing): if `APPROVED` leave exists for that date → 422 `"El empleado tiene una ausencia registrada para este día"`
- [x] 🔧 `LeaveResource` — wraps leave + type info + resolved pay/rest values
- [x] 🧪 Feature tests:
  - Register full-day FIXED_PERCENTAGE leave → attendance updated
  - Register PROPORTIONAL_HOURS SCHEDULED → validates times
  - Register PROPORTIONAL_HOURS OPEN_ENDED → no end time required
  - Override pay_percentage → uses override, not type default
  - Check-in blocked after leave registered
  - Unauthorized access (401/403)

---

## ✅ Frontend Tasks

- [x] 📝 Add types to `src/types/leave.ts`: `LeaveType`, `Leave`, `LeaveStatus`, `LeaveCalculationMode`, `RestDayFactor`, `LeaveTimeMode`
- [x] 🔧 `src/services/leave-api.ts`: `getLeaveTypes()` + `registerDirectLeave(data)`
- [x] 📱 **"Registrar ausencia" button** on each employee row in Today view (alongside check-in/check-out)
- [x] 📱 **Register absence modal/form** (react-hook-form + zod):
  - Leave type selector — shows calculation mode indicator and default pay %
  - If `FIXED_PERCENTAGE`: `start_date` / `end_date` (defaults to today)
  - If `PROPORTIONAL_HOURS`: date locked to today; `time_mode` toggle (Horario fijo / Abierto); `scheduled_start_time`; `scheduled_end_time` only if `SCHEDULED`; optional `actual_start_time` / `actual_end_time` if times are already known
  - `pay_percentage` override — pre-filled from type default, editable; shows impact label ("sin descuento" / "descuento parcial X%" / "sin goce")
  - `rest_day_factor` override — pre-filled from type default, editable; shows impact label
  - `notes` textarea
- [x] 📱 After submit: employee row in Today view shows `LEAVE` status badge; check-in/check-out buttons disappear
- [ ] 📱 For `PROPORTIONAL_HOURS` OPEN_ENDED approved leaves: show "Registrar regreso" button on the employee row in Today view → fills `actual_end_time` and recomputes `actual_duration_minutes` _(deferred to #078)_
- [x] 🔧 `useRegisterLeaveDialog` hook — owns mutation, modal state, form reset

---

## 🧪 Tests

- [x] ✅ PHPUnit: 15 tests / 41 assertions — RegisterDirectLeaveApiTest
- [x] ✅ Vitest: RegisterLeaveDialog (22 tests), use-register-leave-dialog (9 tests), EmployeeAttendanceCard (30 tests), leave-api (3 tests), datetime (10 tests)
- [ ] 🌲 Cypress E2E (happy path): open Today view → click "Registrar ausencia" on an employee → select type, fill form → submit → employee row shows LEAVE badge _(pending — will add in follow-up)_

---

## 🎯 Acceptance Criteria

- [x] Manager registers a full-day absence from Today view; attendance row shows LEAVE badge immediately
- [x] Manager registers a PROPORTIONAL_HOURS absence (SCHEDULED); actual return can be recorded from the row
- [x] pay_percentage and rest_day_factor show defaults from type and are editable
- [ ] Attempting check-in on an employee with an approved leave shows a clear error
- [ ] Seeder populates 4 default leave types

---

## 🔗 References

- **Backlog:** AP-048, AP-049, AP-050 · RF-24, RF-25, RF-25a, RF-25b, RF-25c, RF-25d, RF-25e

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `8h` · **Tracked:** `5h 40m`

### 📅 Sessions
```json
[
  { "date": "2026-04-09", "start": "12:30", "end": "15:00" },
  { "date": "2026-04-09", "start": "20:00", "end": "23:10" }
]
```
