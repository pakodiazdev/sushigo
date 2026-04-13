# 📋 Task #098: Today View — Leave Context on Employee Cards

## 📖 Story

**English:**
As a Manager, I want the Today view to show approved leave context on each employee's card (e.g., "Permiso c/g — sale a las 14:00" or "Día de permiso aprobado"), so I can quickly understand why an employee is absent or leaving early without navigating to their detail page.

**Español:**
Como Manager, quiero que la vista de Hoy muestre el contexto del permiso aprobado en cada tarjeta de empleado (ej. "Permiso c/g — sale a las 14:00" o "Día de permiso aprobado"), para entender rápidamente por qué un empleado está ausente o sale temprano sin navegar a su detalle.

---

## 🧠 Key Design Decisions

- `TodayAttendanceController` already returns a row per employee. We add an optional `today_leave` field to each row.
- `today_leave` is populated by a query: approved Leave records whose `start_date <= today <= end_date` for each employee.
- The Leave model supports two `time_mode` values: `SCHEDULED` (fixed start/end times per day) and `OPEN_ENDED` (full day). Only `SCHEDULED` leaves expose `starts_at` / `ends_at` on the card.
- The Leave model supports two `calculation_mode` values: `FIXED_PERCENTAGE` (fully paid/deducted) and `PROPORTIONAL_HOURS` (partial day). The card displays a "c/g" (con goce) or "s/g" (sin goce) badge based on whether the leave is paid.
- Full-day OPEN_ENDED leaves: the employee should not show up — the card shows "Permiso aprobado (todo el día)" and hides action buttons.
- Partial PROPORTIONAL_HOURS SCHEDULED leaves: employee shows up for part of the shift. The card shows context ("sale a las X:XX" or "llega a las X:XX") but action buttons remain active.
- `today_leave` is `null` when no approved leave exists for today.

---

## ✅ Backend Tasks

- [ ] 📝 Add `today_leave` field to `TodayAttendanceRow` API response (via `AttendanceResource` or a new `TodayLeaveResource`)
  - Fields: `id`, `time_mode`, `calculation_mode`, `is_paid`, `starts_at` (nullable), `ends_at` (nullable), `note` (nullable)
- [ ] 🔧 Update `TodayAttendanceController` query: eager-load approved leaves for each employee covering today's date
  - Use `whereDate('start_date', '<=', $today)->whereDate('end_date', '>=', $today)->where('status', 'APPROVED')`
  - Take only the first matching leave per employee (most recent if multiple)
- [ ] 🧪 PHPUnit feature tests:
  - Employee with approved full-day leave today → `today_leave` present, `time_mode = OPEN_ENDED`
  - Employee with approved partial leave today → `today_leave` present, `time_mode = SCHEDULED`, `starts_at`/`ends_at` populated
  - Employee with no leave → `today_leave = null`
  - Employee with PENDING leave → `today_leave = null` (only APPROVED counts)
  - Employee with REJECTED leave → `today_leave = null`

## ✅ Frontend Tasks

- [ ] 📝 Add `TodayLeave` type to `src/types/attendance.ts`:
  ```ts
  interface TodayLeave {
    id: string
    time_mode: 'SCHEDULED' | 'OPEN_ENDED'
    calculation_mode: 'FIXED_PERCENTAGE' | 'PROPORTIONAL_HOURS'
    is_paid: boolean
    starts_at: string | null  // ISO UTC
    ends_at: string | null    // ISO UTC
    note: string | null
  }
  ```
- [ ] 📝 Add `today_leave: TodayLeave | null` to `TodayAttendanceRow` type
- [ ] 📱 **Leave context chip** on `EmployeeAttendanceCard`:
  - If `today_leave` is present and `time_mode = OPEN_ENDED`: show `CalendarX` icon + "Permiso aprobado" chip (blue/info) — hide "Registrar entrada" and "Marcar falta" buttons
  - If `today_leave` is present and `time_mode = SCHEDULED`:
    - If `starts_at` is after now: "Llega a las HH:mm (permiso)" chip
    - If `ends_at` is before now: "Salió a las HH:mm (permiso)" chip
    - Otherwise: "Permiso c/g hasta HH:mm" or "Permiso s/g hasta HH:mm" chip
  - Chip shows `c/g` (con goce) when `is_paid = true`, `s/g` (sin goce) when `false`
- [ ] 🔧 Update `EmployeeAttendanceCardProps` — add `row.today_leave` (already on the row, no new prop needed)

---

## 🧪 Tests

- [ ] ✅ PHPUnit: all backend feature tests listed above
- [ ] ✅ Vitest: `EmployeeAttendanceCard` — renders leave chip for OPEN_ENDED leave, hides action buttons; renders partial leave chip for SCHEDULED leave with times; no chip when `today_leave = null`
- [ ] 🌲 Cypress E2E (happy path): Employee with pre-seeded approved leave → Today view shows the leave chip on their card

---

## 🎯 Acceptance Criteria

- [ ] Employee card shows leave context chip when an approved leave covers today
- [ ] Full-day leave: action buttons are hidden (no "Registrar entrada" or "Marcar falta")
- [ ] Partial leave: action buttons remain active; chip shows departure or arrival time
- [ ] c/g / s/g badge correctly reflects `is_paid`
- [ ] No leave → no chip, no change in behavior

---

## 🔗 References

- **Backlog:** AP-050 · RF-25, RF-28
- **Depends on:** #077 (Leave model), #055 (Today card redesign)
- **Blocks:** #096 (leave request flow — Today view must display the leave before the flow is complete)

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3.5h`

---

> **GitHub Issue:** pakodiazdev/sushigo#104
