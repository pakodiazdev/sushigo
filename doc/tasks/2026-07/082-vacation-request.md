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
- **Optimistic:** `3h` · **Pessimistic:** `5h` · **Tracked:** `6h 23m`

### 📅 Sessions
```json
[
  { "date": "2026-07-03", "start": "02:13", "end": "08:36" }
]
```

## 📊 Retrospective
- **Actual total:** 6h 23m (383 min)
- **vs optimistic:** +3h 23m
- **vs pessimistic:** +1h 23m

**Justification:**

The overrun came from the full-stack scope required by strict TDD: backend (migration, model, enum, FormRequest, guards trait, 3 actions, 3 controllers, a list controller, route wiring, and permission seeding across 3 seeder files) plus frontend (types, service, hooks, a two-date-range request dialog, and requests list wired into the existing Vacaciones section) — each written from scratch by mirroring the closest existing precedent (the `Leave` module). Two things weren't in the original estimate: (1) extending two pre-existing Vitest suites (`use-vacation-section` and `vacation-section`) whose mocked hook contracts broke once the hook gained new fields, requiring test updates beyond the new feature's own tests; (2) verifying the mandatory Cypress E2E spec against the real dev-lab E2E stack, which required building the `sushigo-c` E2E container from scratch and debugging one flaky assertion caused by the Dev Debugger overlay re-appearing after navigation.
