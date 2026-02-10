# 🗄️ Task #039: PunctualityException Migration & Model

## 📖 Story

**English:**
As a developer, I need to create the `PunctualityException` model, to support per-employee/day exceptions (e.g., Andrea Tue/Wed/Thu = 0%).

**Español:**
Como desarrollador, necesito crear el modelo `PunctualityException`, para soportar excepciones por empleado/día.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_punctuality_exceptions_table` — id, employee_id (FK), day_of_week (smallint nullable), forced_percentage (decimal 5,2), effective_from, effective_to (nullable), reason (varchar nullable), timestamps
- [ ] 🔧 Create `PunctualityException` model — scope effective(date), method appliesToDay(dayOfWeek): bool (null day_of_week = all days)
- [ ] 🧪 Unit tests: exception for specific day, exception for all days, effective scope

---

## 🎯 Acceptance Criteria

- [ ] NULL day_of_week applies to all days
- [ ] Effective scope filters by date

---

## 🔗 References

- **Backlog:** AP-026
- RF-37
- domain-model.md §2.19

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h`
- **Pessimistic:** `1.5h`
- **Tracked:** ``

### 📅 Sessions
```json
[]
```
