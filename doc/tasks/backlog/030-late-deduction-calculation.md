# 🔢 Task #030: Late Deduction Calculation Logic (>30 min)

## 📖 Story

**English:**
As the system, I need to mark lateness >30 min as deductible, so the weekly close deducts correctly.

**Español:**
Como sistema, necesito marcar tardanzas >30 min como deducibles, para que el cierre semanal las descuente correctamente.

---

## ✅ Technical Tasks

- [ ] 🔧 Add method `Attendance::deductibleEntryMinutes()` — if entry_late_seconds > 1800, return floor(entry_late_seconds / 60), else 0
- [ ] 🔧 Add method `Attendance::deductibleLunchMinutes()` — same logic for lunch_late_seconds
- [ ] 🔧 Add method `Attendance::totalDeductibleMinutes()` — sum of both
- [ ] 🔧 Add method `Attendance::isEntryLateDeductible()` and `isLunchLateDeductible()` — boolean helpers
- [ ] 🧪 Unit tests: boundary at 1800s (false) vs 1801s (true), minutes calculation (1860s → 31min), combined deduction

---

## 🎯 Acceptance Criteria

- [ ] 1800s = not deductible, 1801s = deductible
- [ ] Minutes correctly floored from seconds

---

## 🔗 References

- **Backlog:** AP-017
- RF-15b, RN-00
- domain-model.md §2.7

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
