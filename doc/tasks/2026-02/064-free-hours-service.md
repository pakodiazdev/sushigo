# ⚙️ Task #064: Free Hours Calculation Service

## 📖 Story

**English:**
As the system, I need to calculate free hours earned from punctual weeks.

**Español:**
Como sistema, necesito calcular las horas libres ganadas por semanas puntuales.

---

## ✅ Technical Tasks

- [ ] 🔧 Create `PunctualityService::calculateFreeHours(punctualDaysCount, lastTwoPunctual)`: decimal
- [ ] 🔧 6 punctual → 1.0h; 5 → 1.0h; 4 → 0.5h; <4 → 0h
- [ ] 🔧 If last 2 days of period NOT punctual → 0h (RN-08)
- [ ] 🧪 Tests for each tier + last-2-days validation

---

## 🎯 Acceptance Criteria

- [ ] Tiers calculated correctly
- [ ] Last 2 days validation works

---

## 🔗 References

- **Backlog:** AP-029
- RF-36, RN-05, RN-06, RN-07, RN-08
- domain-model.md §4.4

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
