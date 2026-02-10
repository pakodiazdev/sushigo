# 🗄️ Task #037: PunctualityRange Migration, Model & Seeder

## 📖 Story

**English:**
As a developer, I need to create the `PunctualityRange` table with the default SushiGo ranges, to configure bonus percentages.

**Español:**
Como desarrollador, necesito crear la tabla `PunctualityRange` con los rangos default de SushiGo, para configurar porcentajes de bono.

---

## ✅ Technical Tasks

- [ ] 📂 Create migration `create_punctuality_ranges_table` — id, min_seconds (int), max_seconds (int nullable), bonus_percentage (decimal 5,2), sort_order (smallint), timestamps
- [ ] 🔧 Create `PunctualityRange` model — method matches(lateSeconds): bool
- [ ] 🌱 Create PunctualityRangeSeeder (RepeatableSeeder) — 5 rows: 0-599=100%, 600-899=50%, 900-1259=25%, 1260-1559=10%, 1560+=0%
- [ ] 🧪 Unit tests: matches() at boundaries (599→true for 100%, 600→true for 50%), seeder creates 5 rows

---

## 🎯 Acceptance Criteria

- [ ] 5 default ranges seeded
- [ ] matches() handles boundaries correctly including NULL max_seconds

---

## 🔗 References

- **Backlog:** AP-024
- RF-32, RN-01
- domain-model.md §1.5, §2.16

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
