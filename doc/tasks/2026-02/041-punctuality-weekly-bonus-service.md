# ⚙️ Task #041: Weekly Punctuality Bonus Calculation Service

## 📖 Story

**English:**
As the system, I need to sum daily bonuses for the week to get the employee's weekly punctuality bonus.

**Español:**
Como sistema, necesito sumar los bonos diarios de la semana para obtener el bono semanal.

---

## ✅ Technical Tasks

- [ ] 🔧 Create `PunctualityService::calculateWeeklyBonus(employee, periodStart, periodEnd)`: { total, dailyBreakdown[] }
- [ ] 🔧 Iterate days in period → calculateDailyBonus for each → sum
- [ ] 🔧 Return total + array of { date, bonus, percentage, late_seconds }
- [ ] 🧪 Tests: full week punctual, week with day offs, mixed lateness week

---

## 🎯 Acceptance Criteria

- [ ] Total = sum of daily bonuses
- [ ] Breakdown includes each day's detail

---

## 🔗 References

- **Backlog:** AP-028
- RF-34, RN-02
- domain-model.md §4.4

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `3h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
