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

---

## 🎯 Acceptance Criteria

- [ ] No data persisted
- [ ] All employees calculated
- [ ] Breakdown per employee returned

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
