# ⚙️ Task #050: Base Pay Calculation Service

## 📖 Story

**English:**
As the system, I need to calculate an employee's base pay for a period (hourly_rate × scheduled hours of worked days).

**Español:**
Como sistema, necesito calcular el sueldo base de un empleado para un periodo (hourly_rate × horas programadas de días trabajados).

---

## ✅ Technical Tasks

- [ ] 🔧 Create `PayrollCalculator::calculateBasePay(employee, periodStart, periodEnd)`: decimal
- [ ] 🔧 Get effective wage (hourly_rate) for the period
- [ ] 🔧 Count attendances with day_status = WORKED in the range and get their scheduled hours
- [ ] 🔧 base_pay = hourly_rate × total_scheduled_hours_of_worked_days
- [ ] 🧪 Tests: 6-day week (38h × $125 = $4,750), week with 1 absence, week with day offs

---

## 🎯 Acceptance Criteria

- [ ] Uses effective wage
- [ ] Only counts WORKED days

---

## 🔗 References

- **Backlog:** AP-041
- RF-22, RF-23
- domain-model.md §4.3 PayrollCalculator

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1.5h`
- **Pessimistic:** `2.5h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
