# 🏖️ Task #082: Request and Approve Vacations

## 📖 Story

**English:**
As a Manager, I want to create a vacation request for an employee and approve it, so the system blocks attendance capture on those days and deducts the days from the employee's balance.

**Español:**
Como Manager, quiero crear una solicitud de vacaciones para un empleado y aprobarla, para que el sistema bloquee el registro de asistencia en esos días y descuente los días del saldo del empleado.

---

## ✅ Backend Tasks

- [x] 📂 Migration `create_vacation_requests_table` — employee_id (FK), vacation_entitlement_id (FK), start_date, end_date, days_count (smallint), status (enum: PENDING|APPROVED|REJECTED|CANCELLED), requested_by (FK), approved_by (FK nullable), approved_at (nullable), notes (nullable), timestamps
- [x] 🔧 `VacationRequest` model — `belongsTo(Employee)`, `belongsTo(VacationEntitlement)`
- [x] 🌐 `POST /api/v1/vacation-requests` — body: `{ employee_id, start_date, end_date, notes }`; auto-calculates days_count; validates sufficient balance (entitled − used ≥ days_count); status = PENDING
- [x] 🌐 `PATCH /api/v1/vacation-requests/{id}/approve` — updates used_days in VacationEntitlement; creates Attendance records with day_status=VACATION for each day
- [x] 🌐 `PATCH /api/v1/vacation-requests/{id}/reject`
- [x] 🔧 Check-in endpoint (existing): if approved vacation exists for that date → 422
- [x] 🧪 Feature tests: create with sufficient balance, insufficient balance rejected, approve (attendance created), check-in blocked

## ✅ Frontend Tasks

- [x] 📝 Add `VacationRequest` type to `src/types/attendance-payroll.ts`
- [x] 🔧 `createVacationRequest(data)` + `approveRequest(id)` + `rejectRequest(id)` in `src/services/vacation.service.ts`
- [x] 📱 **"Solicitar vacaciones" button** in Vacaciones section (#081)
- [x] 📱 **Request form** (react-hook-form + zod) — date range inputs; shows available balance and days_count in real time; warns if insufficient balance
- [x] 📱 **Requests list** in Vacaciones section — date range, days_count, status badge; Approve/Reject buttons on PENDING rows
- [x] 🔧 `useVacationRequests(employeeId)` hook

---

## 🎯 Acceptance Criteria

- [x] Manager creates a request; it shows as PENDING with the correct days_count
- [x] Insufficient balance blocks the request with a clear error
- [x] After approval, attendance records are created and remaining balance decreases

---

## 🔗 References

- **Backlog:** AP-054, AP-055 · RF-27, RF-28

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `5h` · **Tracked:** `20h 5m`

### 📅 Sessions
```json
[
  { "date": "2026-07-03", "start": "02:13", "end": "08:36" },
  { "date": "2026-07-09", "start": "20:25", "end": "23:59" },
  { "date": "2026-07-10", "start": "00:00", "end": "00:49" },
  { "date": "2026-07-10", "start": "16:50", "end": "23:59" },
  { "date": "2026-07-11", "start": "00:00", "end": "00:15" },
  { "date": "2026-07-11", "start": "15:20", "end": "17:15" }
]
```

## 📊 Retrospective
- **Actual total:** 20h 5m (1205 min = 383 + 214 + 49 + 429 + 15 + 115)
- **vs optimistic:** +17h 5m
- **vs pessimistic:** +15h 5m

**Justification:**

The original 3–5h estimate assumed a single straightforward CRUD-style feature mirroring the `Leave` module, and the first session delivered exactly that (migration, model, actions, controllers, permission seeding, request dialog, requests list — see the original retrospective text below). Everything after that session was scope discovered only after using the feature, driven by two forces:

1. **A mid-project architecture pivot.** After the first session shipped, manual testing surfaced that self-service vacation requests didn't appear in the manager's unified "Pendientes de aprobación" queue the way `Permiso` requests do. Fixing this properly meant rerouting self-service vacation requests through the existing `EmployeeRequest` polymorphic system instead of the standalone `VacationRequest` flow — a genuine redesign, not a bug fix: new `VacationRequestHandler`, `SoftDeletes` + balance-reversion on cancel, permission model rework (`vacation-requests.request` → `.schedule`, restricted to admin/super-admin), plus a full replacement of the date-range picker with the day-by-day `MultiDateCalendar` (matching `Permiso`'s UX) and a new `vacation_request_dates` table.
2. **A chain of bugs only visible once real usage started.** Wrong label in "Mis solicitudes", vacation entitlement lookup breaking across calendar-year boundaries, dark-mode contrast in the calendar, and — most notably — `SeniorityService` reading the real OS clock instead of the app's simulated Application Clock, which silently broke entitlement generation for any QA/demo session using time-travel.
3. **The mandatory PR review + SonarCloud gate before merge** (2026-07-11 afternoon): Copilot's automated review flagged 4 issues on the original code shape; 2 were genuine bugs that survived the later refactors in a different form (balance not re-validated at approval time; vacation dates could silently span two entitlement years) and required real fixes with regression tests. SonarCloud's webapp gate then failed on new-code coverage (65.3%, needed ≥80% — the admin scheduling dialog had zero tests) and duplication (9.0%, needed ≤3% — three genuine copy-paste blocks against sibling dialogs/hooks). Closing both required real test-writing and a small dedup refactor, not just tweaking thresholds.

**Note on session reconstruction:** sessions 2–6 were reconstructed from `[#082]` commit timestamps (clustered by gaps, split at midnight) since work-session start/close commands weren't run again after the first session. Session 6's start time is an estimate — the Application Clock verification and PR-review comment analysis that preceded its first commit produced no commits of their own, so the true start is inferred from conversation structure rather than a logged marker. This likely undercounts slightly rather than overcounts.

---

*Original first-session retrospective (2026-07-03), preserved for context:*

> The overrun came from the full-stack scope required by strict TDD: backend (migration, model, enum, FormRequest, guards trait, 3 actions, 3 controllers, a list controller, route wiring, and permission seeding across 3 seeder files) plus frontend (types, service, hooks, a two-date-range request dialog, and requests list wired into the existing Vacaciones section) — each written from scratch by mirroring the closest existing precedent (the `Leave` module). Two things weren't in the original estimate: (1) extending two pre-existing Vitest suites (`use-vacation-section` and `vacation-section`) whose mocked hook contracts broke once the hook gained new fields, requiring test updates beyond the new feature's own tests; (2) verifying the mandatory Cypress E2E spec against the real dev-lab E2E stack, which required building the `sushigo-c` E2E container from scratch and debugging one flaky assertion caused by the Dev Debugger overlay re-appearing after navigation.
