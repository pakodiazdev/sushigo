# 🗄️ Task #018: WageHistory Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `WageHistory` migration and model, to track hourly compensation rates with effective-dated history.

**Español:**
Como desarrollador, necesito crear la migración y modelo `WageHistory`, para registrar la tarifa por hora con historial de vigencias.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_wage_histories_table` — id, employee_id (FK), hourly_rate (decimal 10,2), weekly_scheduled_hours (decimal 5,2), effective_from (date), effective_to (date nullable), timestamps
- [ ] 🔧 Create `WageHistory` model — $casts (hourly_rate → decimal:2, weekly_scheduled_hours → decimal:2), relationship: belongsTo(Employee)
- [ ] 🔧 Add scope effective(date) — effective_from <= date AND (effective_to IS NULL OR effective_to >= date)
- [ ] 🔧 Add method minuteRate(): decimal — hourly_rate / 60
- [ ] 🔧 Add validation: hourly_rate > 0, weekly_scheduled_hours > 0
- [ ] 🏭 Create WageHistoryFactory
- [ ] 🧪 Unit test: effective scope, minuteRate calculation, positive hourly_rate constraint

---

## 🎯 Acceptance Criteria

- [ ] Scope returns correct wage for a given date
- [ ] minuteRate calculates correctly ($125/hr → $2.083/min)

---

## 🔗 References

- **Backlog:** AP-005
- RF-22
- domain-model.md §2.5 `wage_histories`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
