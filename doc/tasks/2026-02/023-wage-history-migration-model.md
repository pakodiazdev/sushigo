# 🗄️ Task #023: WageHistory Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `WageHistory` migration and model, to track daily wage with effective-dated history.

**Español:**
Como desarrollador, necesito crear la migración y modelo `WageHistory`, para registrar el sueldo diario con historial de vigencias.

---

## ✅ Technical Tasks

- [x] 📂 Create migration `create_wage_histories_table` — id, employee_id (FK), daily_wage (decimal 10,2), effective_from (date), effective_to (date nullable), timestamps
- [x] 🔧 Create `WageHistory` model — $casts (daily_wage → decimal:2), relationship: belongsTo(Employee)
- [x] 🔧 Add scope effective(date) — effective_from <= date AND (effective_to IS NULL OR effective_to >= date)
- [x] 🔧 Add method minuteRate(): decimal — daily_wage / 480 (8h × 60min)
- [x] 🔧 Add validation: daily_wage > 0 — via `WageHistory::RULES` constant (reutilizable en FormRequests)
- [x] 🏭 Create WageHistoryFactory — estados: closed(), current(), withDailyWage(), effectiveBetween()
- [x] 🧪 Unit test: effective scope, minuteRate calculation, positive wage constraint

---

## 🎯 Acceptance Criteria

- [x] Scope returns correct wage for a given date
- [x] minuteRate calculates correctly ($1000/day → $2.083/min)

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
- **Tracked:** `1h`

### 📅 Sessions
```json
[
  {
    "date": "2026-02-19",
    "duration": "1h",
    "branch": "feature/023-wage-history-migration-model",
    "commit": "70cd8e7"
  }
]
```
