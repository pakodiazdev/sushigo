# 🕐 Task #057: Register Partial Leave

## 📖 Story

**English:**
As a Manager, I want to register a partial leave event for an employee (arrive late by permission, leave early, or take time off during the shift), specifying whether it is paid or unpaid, so the system has the evidence to apply deductions at close time.

**Español:**
Como Manager, quiero registrar un permiso parcial para un empleado (llegó tarde con permiso, salió temprano, o tomó tiempo durante el turno), indicando si es pagado o no, para que el sistema tenga la evidencia y aplique deducciones en el cierre.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_partial_leaves_table` — employee_id (FK), attendance_id (FK nullable), type (enum: ARRIVE_LATE|LEAVE_EARLY|TAKE_TIME), is_paid (bool), start_time (nullable), end_time (nullable), duration_minutes, reason, approved_by (FK), timestamps
- [ ] 🔧 `PartialLeave` model — `belongsTo(Employee)`, `belongsTo(Attendance)`, method `deductionAmount(minuteRate)`: returns `duration_minutes × minuteRate` if unpaid, 0 if paid
- [ ] 🌐 `POST /api/v1/partial-leaves` — RegisterPartialLeaveController
- [ ] 📝 StorePartialLeaveRequest — employee_id, date, type, is_paid, start_time (opt), end_time (opt), duration_minutes, reason; `approved_by` from auth user; auto-links attendance_id if attendance exists; auto-computes duration_minutes when start+end provided
- [ ] 🧪 Feature tests: paid leave, unpaid leave, with time window, duration only

## ✅ Frontend Tasks

- [ ] 📝 Add `PartialLeave`, `PartialLeaveType` types to `src/types/attendance-payroll.ts`
- [ ] 🔧 `registerPartialLeave(data)` in `src/services/partial-leave.service.ts`
- [ ] 📱 **"Permiso parcial" button** on each attendance row in the Today view — opens a modal
- [ ] 📱 **Partial leave modal** (react-hook-form + zod) — fields: type (select), is_paid (toggle), start_time + end_time or duration_minutes, reason; duration auto-calculated when both times provided
- [ ] 🔧 `useRegisterPartialLeave()` hook — mutation, on success closes modal and updates row

---

## 🎯 Acceptance Criteria

- [ ] Manager can register a partial leave from the Today view
- [ ] Duration is auto-calculated when start and end times are both entered
- [ ] Paid/unpaid toggle is clearly visible with a label explaining the payroll impact

---

## 🔗 References

- **Backlog:** AP-020, AP-021 · RF-25a, RN-00c

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`
