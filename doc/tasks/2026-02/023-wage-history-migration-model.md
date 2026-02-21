# 🗄️ Task #023: WageHistory Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `WageHistory` migration and model, to track daily wage with effective-dated history.

**Español:**
Como desarrollador, necesito crear la migración y modelo `WageHistory`, para registrar el sueldo diario con historial de vigencias.

---

## ✅ Technical Tasks

- [x] 📂 Create migration `create_wage_histories_table` — id, employee_id (FK), hourly_rate (decimal 10,2), weekly_scheduled_hours (decimal 5,2), effective_from (date), effective_to (date nullable), timestamps
- [x] 🔧 Create `WageHistory` model — $casts (hourly_rate → decimal:2, weekly_scheduled_hours → decimal:2), relationship: belongsTo(Employee)
- [x] 🔧 Add scope effective(date) — effective_from <= date AND (effective_to IS NULL OR effective_to >= date)
- [x] 🔧 Add method minuteRate(): decimal — hourly_rate / 60
- [x] 🔧 Add validation: hourly_rate > 0, weekly_scheduled_hours > 0 — via `WageHistory::RULES` constant
- [x] 🏭 Create WageHistoryFactory — estados: closed(), current(), withHourlyRate(), effectiveBetween()
- [x] 🧪 Unit test: effective scope, minuteRate calculation, positive hourly_rate constraint

---

## 🎯 Acceptance Criteria

- [x] Scope returns correct wage for a given date
- [x] minuteRate calculates correctly ($125/hr → $2.0833/min)

---

## 📝 Nota de diseño: `hourly_rate` como unidad atómica

**Fecha:** 2026-02-21

El esquema original usaba `daily_wage` con `minuteRate() = daily_wage / 480`, asumiendo jornada fija de 8h.
Esto es incorrecto para jornadas variables (RF-10: `FULL` o `PARTIAL`) donde un empleado puede trabajar
6h entre semana y 8h fin de semana, o 4h entre semana y 8h fin de semana.

Con jornadas variables, `daily_wage` varía por día y deja de ser un dato atómico. La unidad real de
compensación es la **tarifa por hora** (`hourly_rate`). El sueldo diario se puede derivar:
`hourly_rate × horas_del_día`.

Se refactorizó el esquema para usar:
- `hourly_rate` (decimal 10,2) — dato real de compensación.
- `weekly_scheduled_hours` (decimal 5,2) — snapshot de la jornada contratada.
- `minuteRate()` → `hourly_rate / 60` (trivial, sin magic numbers).

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
