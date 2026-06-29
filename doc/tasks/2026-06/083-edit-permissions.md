# 🔒 Task #083: Attendance Edit Permissions (Manager vs Admin)

## 📖 Story

**English:**
As a system, I want to enforce that Managers can only edit attendance for the current day while Admins can edit any past day with a mandatory justification, so data integrity and accountability are maintained.

**Español:**
Como sistema, quiero que los Managers solo puedan editar la asistencia del día actual mientras que los Admins puedan editar cualquier día pasado con una justificación obligatoria, para mantener la integridad y trazabilidad de los datos.

---

## ✅ Backend Tasks

- [ ] 🔧 `AttendancePolicy`: if user is not admin and `attendance.date ≠ today` → 403
- [ ] 🔧 Apply restriction to: check-in, lunch-start, lunch-return, check-out, day-status, overtime-decision
- [ ] 🔧 For Admin: when `attendance.date < today`, request requires `reason` field; stored in audit log via `Auditable` trait
- [ ] 🔧 `GET /attendances/today` → renamed to `GET /attendances/daily?date=YYYY-MM-DD` (date optional, defaults to today)
- [ ] 🧪 Feature tests: Manager edits today → OK; Manager edits yesterday → 403; Admin edits yesterday without reason → 422; Admin edits yesterday with reason → OK + audit log entry

## ✅ Frontend Tasks

- [ ] 🔧 `useAttendancePermissions(date)` helper hook — returns `canEdit: boolean`, `requiresReason: boolean`
- [ ] 📱 Rename attendance index route: `/attendance/today` → `/attendance` (file: `today.tsx` → `index.tsx`)
- [ ] 📱 Add date-picker to the attendance index page (admin sees all past dates; manager sees today only)
- [ ] 📱 Hide action buttons for Managers on non-today rows; show lock icon
- [ ] 📱 Admin editing past-day record: inline "Motivo de edición" required field in the time-picker dialogs
- [ ] 🧪 Vitest: `useAttendancePermissions` hook tests

---

## 🎯 Acceptance Criteria

- [ ] Manager sees no edit controls for past-day attendance rows
- [ ] Admin can edit any day; form asks for a reason when the date is in the past
- [ ] 403 from API maps to "No tienes permiso para editar registros históricos"
- [ ] Date-picker on attendance index lets admin browse past dates

---

## 🔗 References

- **Backlog:** AP-066, AP-067 · RF-17, RF-18, RF-19

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `5h` · **Tracked:** `~7h05m`

### 📅 Sessions
```json
[
  { "date": "2026-06-24", "start": "08:43", "end": "13:18" },
  { "date": "2026-06-27", "start": "09:00", "end": "12:30" }
]
```

---

## 📊 Retrospective

**Tracked vs Estimated:** ~4h35m — within the 3h–5h estimate range.

**What took longer than expected:**
- Context rebuilding after compaction mid-session added overhead (~20min).
- `MarkDayStatusAction` refactor from `Attendance::create()` to `new + fill + save()` pattern to control `auditReason` timing was a subtle issue that required investigation.
- Updating 12+ Cypress spec files and 6+ Vitest test suites for the route rename and query key change added more churn than initially estimated.
- Session 2 (2026-06-27): 3 bugs discovered during E2E validation — `AuthTokenResponse` returning only direct permissions (managers got 0 → 403), `fetchBranchesFromApi()` admin-only guard leaving managers without `currentBranch`, and `cy.trigger('change')` not updating React 18 controlled inputs (required native value setter pattern).

**What went smoothly:**
- `AttendancePolicy` auto-discovery with no `AuthServiceProvider` change required.
- Backend TDD: 16 tests written and passing before any implementation code.
- `useAttendancePermissions` hook design was clean and testable.
- All 5 Cypress tests green after fixes, both headless and headed.
