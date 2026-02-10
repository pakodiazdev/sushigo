# 🗄️ Task #046: OvertimePayConfig Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `OvertimePayConfig` model, to configure per-employee overtime valuation.

**Español:**
Como desarrollador, necesito crear el modelo `OvertimePayConfig`, para configurar la valuación de horas extra por empleado.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_overtime_pay_configs_table` — id, employee_id (FK), method (enum: LFT_PROPORTIONAL|AGREED_RATE), hourly_rate (decimal nullable), lft_factor (decimal nullable), effective_from, effective_to (nullable), timestamps
- [ ] 🔧 Create model — scope effective(date), method calculatePay(minutes, dailyWage): for LFT = (dailyWage/8/60) × lft_factor × minutes; for AGREED = (hourly_rate/60) × minutes
- [ ] 🧪 Unit tests: LFT calculation ($1000/day, factor 2.0, 60min → $250), AGREED ($50/hr, 90min → $75)

---

## 🎯 Acceptance Criteria

- [ ] Both valuation methods calculate correctly
- [ ] effective scope works

---

## 🔗 References

- **Backlog:** AP-035
- RF-47c, DC-03
- domain-model.md §2.6

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
