# 🏖️ Task #082: Request and Approve Vacations

## 📖 Story

**English:**
As a Manager, I want to create a vacation request for an employee and approve it, so the system blocks attendance capture on those days and deducts the days from the employee's balance.

**Español:**
Como Manager, quiero crear una solicitud de vacaciones para un empleado y aprobarla, para que el sistema bloquee el registro de asistencia en esos días y descuente los días del saldo del empleado.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_vacation_requests_table` — employee_id (FK), vacation_entitlement_id (FK), start_date, end_date, days_count (smallint), status (enum: PENDING|APPROVED|REJECTED|CANCELLED), requested_by (FK), approved_by (FK nullable), approved_at (nullable), notes (nullable), timestamps
- [ ] 🔧 `VacationRequest` model — `belongsTo(Employee)`, `belongsTo(VacationEntitlement)`
- [ ] 🌐 `POST /api/v1/vacation-requests` — body: `{ employee_id, start_date, end_date, notes }`; auto-calculates days_count; validates sufficient balance (entitled − used ≥ days_count); status = PENDING
- [ ] 🌐 `PATCH /api/v1/vacation-requests/{id}/approve` — updates used_days in VacationEntitlement; creates Attendance records with day_status=VACATION for each day
- [ ] 🌐 `PATCH /api/v1/vacation-requests/{id}/reject`
- [ ] 🔧 Check-in endpoint (existing): if approved vacation exists for that date → 422
- [ ] 🧪 Feature tests: create with sufficient balance, insufficient balance rejected, approve (attendance created), check-in blocked

## ✅ Frontend Tasks

- [ ] 📝 Add `VacationRequest` type to `src/types/attendance-payroll.ts`
- [ ] 🔧 `createVacationRequest(data)` + `approveRequest(id)` + `rejectRequest(id)` in `src/services/vacation.service.ts`
- [ ] 📱 **"Solicitar vacaciones" button** in Vacaciones tab (#081)
- [ ] 📱 **Request form** (react-hook-form + zod) — date range picker; shows available balance and days_count in real time; warns if insufficient balance
- [ ] 📱 **Requests list** in Vacaciones tab — date range, days_count, status badge; Approve/Reject buttons on PENDING rows
- [ ] 🔧 `useVacationRequests(employeeId)` hook

---

## 🎯 Acceptance Criteria

- [ ] Manager creates a request; it shows as PENDING with the correct days_count
- [ ] Insufficient balance blocks the request with a clear error
- [ ] After approval, attendance records are created and remaining balance decreases

---

## 🔗 References

- **Backlog:** AP-054, AP-055 · RF-27, RF-28

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `5h` · **Tracked:** _in progress_

### 📅 Sessions
```json
[
  { "date": "2026-07-03", "start": "02:13", "end": "?" }
]
```
