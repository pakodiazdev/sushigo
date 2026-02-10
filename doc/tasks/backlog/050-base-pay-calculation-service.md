# ⚙️ Task #050: Base Pay Calculation Service

## 📖 Story

**English:**
As the system, I need to calculate an employee's base pay for a period (daily wage × days worked).

**Español:**
Como sistema, necesito calcular el sueldo base de un empleado para un periodo (sueldo diario × días trabajados).

---

## ✅ Technical Tasks

- [ ] 🔧 Create `PayrollCalculator::calculateBasePay(employee, periodStart, periodEnd)`: decimal
- [ ] 🔧 Get effective wage for the period
- [ ] 🔧 Count attendances with day_status = WORKED in the range
- [ ] 🔧 base_pay = daily_wage × days_worked
- [ ] 🧪 Tests: 6-day week ($1000 × 6 = $6000), week with 1 absence ($1000 × 5 = $5000), week with day offs

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
