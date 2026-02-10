# ⚙️ Task #079: Holiday Pay Calculation

## 📖 Story

**English:**
As the system, I need to calculate extra pay when an employee works on a holiday.

**Español:**
Como sistema, necesito calcular el pago extra cuando un empleado trabaja un festivo.

---

## ✅ Technical Tasks

- [ ] 🔧 Create `PayrollCalculator::calculateHolidayPay(attendances, holidays, dailyWage)`: decimal
- [ ] 🔧 If date in holidays AND day_status=WORKED → extra = dailyWage × (multiplier − 1)
- [ ] 🔧 If not worked → no extra
- [ ] 🧪 Tests: worked double (×2 → extra = wage), triple, not worked

---

## 🎯 Acceptance Criteria

- [ ] Extra pay only when worked
- [ ] Multiplier applied correctly

---

## 🔗 References

- **Backlog:** AP-058
- RF-31
- domain-model.md §4.3

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
