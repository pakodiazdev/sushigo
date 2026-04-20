# ➕ Task #059: Register Negotiated Extra Day

## 📖 Story

**English:**
As a Manager, I want to register a negotiated extra work day for an employee with the agreed pay amount, so the system records the agreement and includes it in the weekly close.

**Español:**
Como Manager, quiero registrar un día extra negociado para un empleado con el monto acordado de pago, para que el sistema registre el acuerdo y lo incluya en el cierre semanal.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_negotiated_extra_days_table` — employee_id (FK), branch_id (FK), date, agreed_pay (decimal 10,2), approved_by (FK), notes (nullable), timestamps; UNIQUE(employee_id, date)
- [ ] 🔧 `NegotiatedExtraDay` model — `belongsTo(Employee)`, `belongsTo(Branch)`, validation: agreed_pay > 0
- [ ] 🌐 `POST /api/v1/negotiated-extra-days` — RegisterExtraDayController
- [ ] 🔧 `approved_by` from auth user; creates/updates Attendance for that day with `day_status = EXTRA`
- [ ] 🔧 422 if an extra day already exists for that employee/date
- [ ] 🧪 Feature tests: happy path, duplicate rejected, day_status set to EXTRA

## ✅ Frontend Tasks

- [ ] 📝 Add `NegotiatedExtraDay` type to `src/types/attendance-payroll.ts`
- [ ] 🔧 `registerExtraDay(data)` in `src/services/extra-day.service.ts`
- [ ] 📱 **"Día extra" button** in Today view (per-employee row) — visible when employee has no attendance or status = EXTRA
- [ ] 📱 **Register extra day modal** (react-hook-form + zod) — fields: date (defaults to today), agreed_pay, notes
- [ ] 🔧 `useRegisterExtraDay()` hook — mutation, on success updates row status to EXTRA

---

## 🎯 Acceptance Criteria

- [ ] Manager registers an extra day and the employee's day status changes to EXTRA in the Today view
- [ ] agreed_pay field accepts only positive values
- [ ] Duplicate registration shows a friendly error

---

## 🔗 References

- **Backlog:** AP-031, AP-032 · RF-38, RF-39, RN-09

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`
