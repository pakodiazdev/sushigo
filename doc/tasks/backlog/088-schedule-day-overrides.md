# ⚡ Task #088: Schedule Day Overrides (Temporary Exceptions)

## 📖 Story

**English:**
As an Admin, I want to register a temporary exception for a specific day of the week (e.g., "this Monday Paco arrives at 3pm and leaves one hour early"), so the system uses the override for that date or range and automatically falls back to the base schedule afterwards.

**Español:**
Como Admin, quiero registrar una excepción temporal para un día de la semana específico (ej. "este lunes Paco llega a las 3pm y sale una hora antes"), para que el sistema use la excepción en esa fecha o rango y regrese automáticamente al horario base después.

---

## 🗂️ Data Model — `schedule_day_overrides`

| Column                  | Type          | Notes                                      |
|-------------------------|---------------|--------------------------------------------|
| `id`                    | bigint AI PK  |                                            |
| `public_id`             | ULID          | External identifier                        |
| `employment_period_id`  | FK            | Belongs to an active employment period     |
| `day_of_week`           | int (1-7)     | ISO 8601 — 1=Mon … 7=Sun                  |
| `effective_from`        | date          | Start of override (inclusive)              |
| `effective_to`          | date \| null  | End of override; null = indefinite         |
| `is_day_off`            | bool          | Can override a working day to day-off      |
| `expected_start`        | time \| null  |                                            |
| `expected_lunch_start`  | time \| null  |                                            |
| `expected_lunch_end`    | time \| null  | Computed from start + duration             |
| `lunch_duration_minutes`| int \| null   |                                            |
| `expected_end`          | time \| null  |                                            |
| `note`                  | string \| null| Reason for the exception                   |
| `deleted_at`            | timestamp     | SoftDeletes                                |

### Override scope types (UI)
| UI choice            | effective_from | effective_to       |
|----------------------|---------------|--------------------|
| Solo esta fecha      | chosen date   | same date          |
| Rango de fechas      | start date    | end date           |
| Indefinido           | start date    | `null`             |

> **Indefinido** creates an override with `effective_to = null`. The system resolves this as
> the new permanent configuration for that `day_of_week`. Distinct from #061 (which replaces
> ALL 7 days); this only affects the selected day.

### Resolution logic (for a given employee on date D)
1. Get the base `EmployeeSchedule` effective on D
2. For each `day_of_week`, check `schedule_day_overrides` where:
   - `day_of_week = D.dayOfWeek`
   - `effective_from <= D`
   - `effective_to IS NULL OR effective_to >= D`
3. Override found → use override times; otherwise → use base schedule day

### Override lifecycle
- Overrides are **never deleted manually** — they expire naturally when `effective_to` passes
- `effective_to IS NULL` overrides remain active indefinitely until a newer one is created

---

## ✅ Backend Tasks

- [ ] 🗄️ Migration `create_schedule_day_overrides_table`
- [ ] 📦 Model `ScheduleDayOverride` with `HasPublicId`, `SoftDeletes`, `effective()` scope
- [ ] 🌐 `POST /api/v1/employment-periods/{period}/schedule-day-overrides` — `CreateScheduleDayOverrideController`
- [ ] 📝 `StoreScheduleDayOverrideRequest` — validates day_of_week, effective_from, optional effective_to, time fields
- [ ] 📦 `ScheduleDayOverrideResource`
- [ ] 🔧 Update `CurrentScheduleController` to include active overrides per day in response
- [ ] 🧪 Feature tests: create override, override fallback logic, 404, 403

## ✅ Frontend Tasks

- [ ] 📱 In `ScheduleDialog`, show ⚡ badge on rows with an active/upcoming override
- [ ] 🖊️ Pencil icon per day row → inline edit mode (time inputs appear)
- [ ] 📱 On save → "Override Scope Dialog":
  - Option A: Solo esta fecha → date picker
  - Option B: Rango de fechas → start + optional end
  - Option C: Indefinido → start date, no end
- [ ] 📝 `scheduleApi.createDayOverride(periodId, data)`
- [ ] 🔧 `useCreateDayOverride(periodId)` mutation hook
- [ ] 📱 On success → invalidate `current-schedule` query, close scope dialog

---

## 🎯 Acceptance Criteria

- [ ] Admin can edit one day row in the schedule dialog and set a time range for the exception
- [ ] Rows with an active override show a visual indicator (⚡ badge)
- [ ] The system uses the override on the applicable date(s) and falls back to base schedule after
- [ ] Overrides with no end date remain active indefinitely
- [ ] No manual deletion — overrides expire by date

---

## 🔗 References

- **Backlog:** AP-012 · RF-10
- **Depends on:** #056 (schedule dialog), #053 (schedule create)

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `6h`
