# 👁️ Task #072: Preview Weekly Payroll Close

## 📖 Story

**English:**
As a Manager, I want to see a preview of the weekly payroll close with each employee's totals and full breakdown before confirming, so I can catch any errors before freezing the data.

**Español:**
Como Manager, quiero ver un preview del cierre semanal de nómina con los totales y el desglose completo de cada empleado antes de confirmar, para detectar errores antes de congelar los datos.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_pay_periods_table` — branch_id (FK), period_start, period_end, status (enum: OPEN|CLOSED|REOPENED), closed_by (FK nullable), closed_at (nullable), reopened_by (FK nullable), reopened_at (nullable), reopen_reason (nullable), meta (json nullable), timestamps; UNIQUE(branch_id, period_start, period_end)
- [ ] 📂 Migration `create_pay_period_employees_table` — pay_period_id (FK), employee_id (FK), base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, holiday_pay, other_adjustments, total_pay, free_hours_earned, daily_snapshot (json), timestamps; UNIQUE(pay_period_id, employee_id)
- [ ] 📂 Migration `create_pay_period_lines_table` — pay_period_employee_id (FK), date, concept (enum: BASE_PAY|LATE_DEDUCTION|UNPAID_LEAVE|OVERTIME|EXTRA_DAY|PUNCTUALITY_BONUS|HOLIDAY|OTHER), description, amount, minutes (nullable), meta (json nullable), timestamps
- [ ] 🔧 `PayPeriod`, `PayPeriodEmployee`, `PayPeriodLine` models with relationships and methods `isOpen()`, `isClosed()`, `calculateTotal()`
- [ ] 🔧 `PayrollCalculator::calculateEmployee(employee, periodStart, periodEnd)` — orchestrates: base_pay (hourly_rate × scheduled hours of WORKED days), late_deductions (>1800s entries and lunch returns × minuteRate), unpaid_leave_deductions (PartialLeave), overtime_pay (sum PAID OvertimeBankMovements), extra_day_pay (sum NegotiatedExtraDay.agreed_pay), punctuality_bonus (PunctualityService::calculateWeeklyBonus), free_hours, daily_snapshot, pay_period_lines
- [ ] 🌐 `GET /api/v1/pay-periods/preview?branch_id=&period_start=&period_end=` — runs PayrollCalculator for all active employees; returns results without persisting
- [ ] 🧪 Unit tests: PayrollCalculator with all concepts; Feature test: preview response structure

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/payroll/close.tsx`
- [ ] 📝 Add `PayPeriod`, `PayPeriodEmployee`, `PayPeriodLine`, `PayConcept` types to `src/types/attendance-payroll.ts`
- [ ] 🔧 `getClosePreview(branchId, periodStart, periodEnd)` in `src/services/payroll.service.ts`
- [ ] 📱 **Payroll close page** — date range selector (defaults to current week Mon–Sun); "Calcular preview" button loads the table
- [ ] 📱 **Preview table** — one row per employee: name, base_pay, deductions (−), extras (+), bonuses (+), **total** highlighted; expandable daily evidence per employee
- [ ] 📱 Loading state with skeleton while calculating
- [ ] 🔧 `useClosePreview(branchId, range)` hook

---

## 🎯 Acceptance Criteria

- [ ] Manager selects a date range and sees the full per-employee breakdown before closing
- [ ] All concepts (base, deductions, overtime, bonus, extras) appear as separate rows
- [ ] No data is persisted when viewing the preview

---

## 🔗 References

- **Backlog:** AP-040–045 · RF-20, RF-22, RF-49, RN-00, RN-01

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `8h` · **Pessimistic:** `13h` · **Tracked:** `0h 29min`

### 📅 Sessions
```json
[
  { "date": "2026-06-24", "start": "08:40", "end": "09:09" }
]
```
