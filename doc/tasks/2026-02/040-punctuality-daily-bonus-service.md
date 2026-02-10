# ⚙️ Task #040: Daily Punctuality Bonus Calculation Service

## 📖 Story

**English:**
As the system, I need to calculate the daily punctuality bonus for an employee, accumulating toward the weekly total.

**Español:**
Como sistema, necesito calcular el bono de puntualidad diario de un empleado, para acumular su bono semanal.

---

## ✅ Technical Tasks

- [ ] 🔧 Create `PunctualityService::calculateDailyBonus(employee, date, attendance)`: decimal
- [ ] 🔧 Step 1: Get employee's bonus group (via EmployeeBonusConfig effective on date) → dailyBonusAmount
- [ ] 🔧 Step 2: Get entry_late_seconds from attendance → find matching PunctualityRange → percentage
- [ ] 🔧 Step 3: Check PunctualityException for employee/date → if exists, use forced_percentage
- [ ] 🔧 Step 4: If day_status = DAY_OFF → return 0 (RN-03)
- [ ] 🔧 Step 5: If day_status = EXTRA → return 0 (RN-04)
- [ ] 🔧 Step 6: If day_status = ABSENCE → return 0
- [ ] 🔧 Return: dailyBonusAmount × (percentage / 100)
- [ ] 🧪 Tests: punctual (100%), late 12min (50%), day off (0), extra day (0), with exception override

---

## 🎯 Acceptance Criteria

- [ ] Correct percentage per lateness range
- [ ] Day off/extra/absence = 0
- [ ] Exception overrides range

---

## 🔗 References

- **Backlog:** AP-027
- RF-34, RF-35, RN-01, RN-03, RN-04
- domain-model.md §4.4 PunctualityService

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
