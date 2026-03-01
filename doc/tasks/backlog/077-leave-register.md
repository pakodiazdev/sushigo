# 🏥 Task #077: Register a Full-Day Leave

## 📖 Story

**English:**
As a Manager, I want to register a full-day leave for an employee (medical, personal, family emergency), so the system has the record and can reflect it in attendance and payroll.

**Español:**
Como Manager, quiero registrar una ausencia de día completo para un empleado (médica, personal, emergencia familiar), para que el sistema tenga el registro y pueda reflejarlo en asistencia y nómina.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_leave_types_table` — code (unique), name, is_paid (bool), timestamps; seeder with: MEDICAL (paid), PERSONAL (unpaid), FAMILY_EMERGENCY (paid)
- [ ] 📂 Migration `create_leaves_table` — employee_id (FK), leave_type_id (FK), start_date, end_date, status (enum: PENDING|APPROVED|REJECTED|CANCELLED), requested_by (FK), approved_by (FK nullable), approved_at (nullable), notes (nullable), timestamps
- [ ] 🔧 `LeaveType` model; `Leave` model — `belongsTo(Employee)`, `belongsTo(LeaveType)`, scopes: `pending()`, `approved()`
- [ ] 🌐 `POST /api/v1/leaves` — RegisterLeaveController; created with status = PENDING
- [ ] 🧪 Feature tests: register leave, validate required fields

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/leaves/new.tsx`
- [ ] 📝 Add `Leave`, `LeaveType`, `LeaveStatus` types to `src/types/attendance-payroll.ts`
- [ ] 🔧 `getLeaveTypes()` + `registerLeave(data)` in `src/services/leave.service.ts`
- [ ] 📱 **"Registrar ausencia" button** accessible from Employee Detail and Today view
- [ ] 📱 **Register leave form** (react-hook-form + zod) — employee selector (if accessed from general view), leave_type selector (with is_paid indicator), start_date, end_date, notes
- [ ] 📱 After submit: leave appears in list with status PENDING
- [ ] 🔧 `useRegisterLeave()` hook

---

## 🎯 Acceptance Criteria

- [ ] Manager can register a leave; it appears with PENDING status
- [ ] Leave type selector shows whether the type is paid or unpaid
- [ ] Seeder populates the 3 default leave types

---

## 🔗 References

- **Backlog:** AP-048, AP-049, AP-050 (partial) · RF-24, RF-25

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
