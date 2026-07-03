# 📈 Task #068: View Weekly Summary Report per Employee

## 📖 Story

**English:**
As a Manager, I want to see a complete weekly breakdown per employee (base pay, deductions, bonuses, and total), so I can verify the numbers before confirming the payroll close.

**Español:**
Como Manager, quiero ver el resumen semanal completo por empleado (pago base, deducciones, bonos y total), para verificar los números antes de confirmar el cierre de nómina.

---

## ✅ Backend Tasks

- [ ] 🔧 `PunctualityService::calculateDailyBonus(employee, date, attendance)` — gets bonus group → dailyBonusAmount → finds matching range → checks exceptions; returns 0 for DAY_OFF / EXTRA / ABSENCE
- [ ] 🔧 `PunctualityService::calculateWeeklyBonus(employee, periodStart, periodEnd)` — sums daily bonuses; returns total + daily breakdown array
- [ ] 🔧 `PunctualityService::calculateFreeHours(punctualDays, lastTwoDaysPunctual)` — 6 days=1h, 5 days=1h, 4 days=0.5h, <4=0h; 0h if last 2 days not punctual
- [ ] 🌐 `GET /api/v1/reports/weekly-summary?employee_id=&period_start=&period_end=` — WeeklySummaryController; calculates live (no closed period needed)
- [ ] 🔧 Response: base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, free_hours_earned, total_pay + daily_evidence[] (date, check_in, check_out, day_status, late_minutes, partial_leaves, overtime)
- [ ] 🧪 Unit tests: PunctualityService (on time, late, day-off, with exception); Feature test: full week calculation

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/reports/weekly.tsx`
- [ ] 🔧 `getWeeklySummary(employeeId, periodStart, periodEnd)` in `src/services/report.service.ts`
- [ ] 📱 **Weekly summary page** — employee selector + date range picker (defaults to current Mon–Sun)
- [ ] 📱 **Concepts breakdown card** — rows: Base, Tardanzas (−), Permisos no pagados (−), Horas extra (+), Día extra (+), Bono puntualidad (+), Total highlighted
- [ ] 📱 **Daily evidence table** — columns: date, check_in, check_out, status badge, late min, deducted min, partial leaves, overtime
- [ ] 🔧 `useWeeklySummary(employeeId, range)` hook

---

## 🎯 Acceptance Criteria

- [ ] Manager selects an employee and date range and sees the full financial breakdown
- [ ] Daily evidence table shows each day with timestamps and deduction details
- [ ] Total is computed correctly from all concepts

---

## 🔗 References

- **Backlog:** AP-027, AP-028, AP-029, AP-060 · RF-34, RF-35, RF-36, RF-49, RN-01–08

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `5h` · **Pessimistic:** `9h` · **Tracked:** `8h`

### 📅 Sessions
```json
[
  { "date": "2026-06-24", "start": "10:00", "end": "14:00", "duration": "4h" },
  { "date": "2026-06-24", "start": "17:00", "end": "21:00", "duration": "4h" }
]
```

---

## 📊 Retrospective

**Tracked vs Estimated:** 8h tracked, 5–9h estimated. Within range.

**Scope expansion:** Issue #068 required AP-020 (PartialLeave), AP-026 (PunctualityService), AP-034 (OvertimeBankMovement) as prerequisites. This added 3 migrations, 4 enums, 3 models, and a full PunctualityService — roughly 3h extra that was unaccounted in the original estimate.

**Key blocker:** PostgreSQL deadlock when creating multiple FK constraints to `users` in a single `Schema::create()` transaction. Solved by separating FK creation into a subsequent `Schema::table()` call. Also required manually recreating the test DB after a partial migration left it in inconsistent state.

**Rest-day formula:** User confirmed proration formula — `base_pay = worked_days × daily_rate × (1 + 1/scheduled_working_days)` — which correctly distributes the rest day proportionally by days actually worked. Implemented exactly as specified.
