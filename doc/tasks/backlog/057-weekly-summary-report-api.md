# 📊 Task #057: Weekly Summary Report API (per employee)

## 📖 Story

**English:**
As a Manager, I want to view the weekly summary for an employee with full breakdown, for pre-close review.

**Español:**
Como Manager, quiero consultar el resumen semanal de un empleado con desglose completo.

---

## ✅ Technical Tasks

- [ ] 🌐 `GET /api/v1/reports/weekly-summary?employee_id=&period_start=&period_end=` — WeeklySummaryController
- [ ] 🔧 If closed period exists → return from snapshot; else → calculate live via PayrollCalculator
- [ ] 🔧 Response: totals + daily evidence table (date, check_in, check_out, lunch_end, day_status, late_minutes, deducted_minutes, partial_leaves[], overtime_minutes, overtime_paid, bonus)
- [ ] 🧪 Feature tests: live calculation, from closed snapshot

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Weekly Summary Page** — route: `/reports/weekly`; inputs: employee (select/search), period_start (date), period_end (date)
- [ ] 📱 **Summary Cards** — base_pay, deductions (late + unpaid), overtime_pay, bonus, **total** (highlighted)
- [ ] 📱 **Daily Evidence Table** — rows per day: date, check_in, check_out, lunch_end, day_status, late_minutes, deducted_minutes, partial_leaves count, overtime_minutes, bonus; color-code anomalies (late, absence)
- [ ] 📱 **Source Indicator** — badge: "Periodo cerrado (snapshot)" vs "Cálculo en vivo"
- [ ] 📱 **Print Layout** — print-friendly CSS for physical payroll records
- [ ] 📱 Hook: `useWeeklySummary(employeeId, start, end)` — query
- [ ] 🧪 E2E test: view live summary, view closed snapshot, verify daily table

---

## 🎯 Acceptance Criteria

- [ ] Returns snapshot if closed, live if open
- [ ] Daily evidence complete
- [ ] 🖥️ Summary cards show correct totals
- [ ] 🖥️ Daily evidence table fully populated
- [ ] 🖥️ Source (live/snapshot) clearly indicated

---

## 🔗 References

- **Backlog:** AP-060
- RF-49
- backlog AP-060

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
