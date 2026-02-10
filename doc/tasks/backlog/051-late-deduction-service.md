# ⚙️ Task #051: Late Deduction Service (>30 min entry + lunch)

## 📖 Story

**English:**
As the system, I need to calculate total late deductions for a period.

**Español:**
Como sistema, necesito calcular el total de deducciones por tardanza >30 min del periodo.

---

## ✅ Technical Tasks

- [ ] 🔧 Create `PayrollCalculator::calculateLateDeductions(attendances, minuteRate)`: decimal
- [ ] 🔧 Filter where entry_late_seconds > 1800 → floor(seconds/60) × minuteRate
- [ ] 🔧 Filter where lunch_late_seconds > 1800 → same logic
- [ ] 🔧 Return sum of both
- [ ] 🧪 Tests: no lates, 1 entry late (35min → 35 × rate), 1 lunch late, both in same day, multiple days

---

## 🎯 Acceptance Criteria

- [ ] Only deducts > 30min
- [ ] Both entry and lunch counted separately

---

## 🔗 References

- **Backlog:** AP-042
- RF-15b, RN-00
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
