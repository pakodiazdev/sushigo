# ⚙️ Task #053: PayrollCalculator — Full Period Calculation Service

## 📖 Story

**English:**
As the system, I need to orchestrate the complete pay calculation for one employee in a period, producing the snapshot with all concepts.

**Español:**
Como sistema, necesito orquestar el cálculo completo de un periodo para un empleado, generando el snapshot con todos los conceptos.

---

## ✅ Technical Tasks

- [ ] 🔧 Create `PayrollCalculator::calculateEmployee(employee, periodStart, periodEnd)`: array
- [ ] 🔧 Orchestrate: calculateBasePay, calculateLateDeductions, calculateUnpaidLeaveDeductions, sum PAID overtime movements, sum negotiated extra day agreed_pay, PunctualityService::calculateWeeklyBonus, calculateFreeHours
- [ ] 🔧 Apply total formula: base − late − unpaid_leave + overtime + extra_day + bonus + holiday + other
- [ ] 🔧 Generate daily_snapshot: array per day with {date, check_in, check_out, lunch_end, day_status, late_seconds, deducted_minutes, partial_leaves, overtime_minutes, overtime_paid, bonus}
- [ ] 🔧 Generate pay_period_lines: one PayPeriodLine per concept per day
- [ ] 🧪 Integration test: employee with all concepts in a week → verify total matches manual calculation

---

## 🎯 Acceptance Criteria

- [ ] All concepts calculated and aggregated
- [ ] Total matches formula
- [ ] Daily snapshot has complete evidence
- [ ] Lines generated per concept/day

---

## 🔗 References

- **Backlog:** AP-044
- RF-20, RF-49
- domain-model.md §4.3 PayrollCalculator, sequence §6.3

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h`
- **Pessimistic:** `8h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
