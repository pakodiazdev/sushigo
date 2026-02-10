# 🌐 Task #054: Weekly Close Preview API

## 📖 Story

**English:**
As a Manager, I want to preview the weekly close before confirming, to verify totals.

**Español:**
Como Manager, quiero ver un preview del cierre semanal antes de confirmarlo, para verificar los totales.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/pay-periods/preview?branch_id=&period_start=&period_end=` — PreviewPayPeriodController
- [ ] 🔧 Execute PayrollCalculator for each active employee in the branch for the period
- [ ] 🔧 Return array of employee summaries (do NOT persist anything)
- [ ] 🔧 Response per employee: { employee_id, name, base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, total_pay, daily_evidence[] }
- [ ] 🧪 Feature tests: preview with multiple employees, empty period

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Weekly Close Preview Page** — route: `/payroll/preview`; inputs: branch (select), period_start (date), period_end (date); "Generar Preview" button
- [ ] 📱 **Preview Results Table** — per employee: base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, **total_pay** (highlighted); totals row at bottom
- [ ] 📱 **Employee Detail Expand** — click row to expand daily evidence (date, check-in, check-out, status, late, deductions, bonus)
- [ ] 📱 **Confirm Close Button** — at bottom of preview, navigates to close confirmation (#055)
- [ ] 📱 **Print/Export** — optional print-friendly view or PDF export
- [ ] 📱 Hooks: `usePayPeriodPreview(branchId, start, end)` — query (not mutation, no persistence)
- [ ] 🧪 E2E test: generate preview, expand employee, verify totals

---

## 🎯 Acceptance Criteria

- [ ] No data persisted
- [ ] All employees calculated
- [ ] Breakdown per employee returned
- [ ] 🖥️ Preview table renders all pay concepts
- [ ] 🖥️ Daily evidence expandable per employee
- [ ] 🖥️ Totals row calculates correctly

---

## 🔗 References

- **Backlog:** AP-045
- RF-20, RF-49
- domain-model.md §4.3, sequence §6.3

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `3h`
- **Pessimistic:** `5h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
