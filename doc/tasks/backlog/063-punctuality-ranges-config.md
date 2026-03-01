# 🎯 Task #063: Configure Punctuality Ranges

## 📖 Story

**English:**
As an Admin, I want to view and update the punctuality bonus percentage ranges (e.g., 0–9 min = 100%, 10–14 min = 50%), so I can adjust the business rules without a code change.

**Español:**
Como Admin, quiero ver y actualizar los rangos de porcentaje del bono de puntualidad (p.ej. 0–9 min = 100%, 10–14 min = 50%), para ajustar las reglas del negocio sin cambiar código.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_punctuality_ranges_table` — min_seconds (int), max_seconds (int nullable), bonus_percentage (decimal 5,2), sort_order (smallint), timestamps
- [ ] 🔧 `PunctualityRange` model — method `matches(lateSeconds): bool`
- [ ] 🌱 `PunctualityRangeSeeder` (RepeatableSeeder) — 5 rows: 0-599=100%, 600-899=50%, 900-1259=25%, 1260-1559=10%, 1560+=0%
- [ ] 🌐 `GET /api/v1/punctuality/ranges` — list all ranges ordered by sort_order
- [ ] 🌐 `PUT /api/v1/punctuality/ranges` — bulk update all ranges in one request
- [ ] 🧪 Unit tests: `matches()` at boundaries; Feature tests: list, bulk update

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/config/punctuality.tsx`
- [ ] 📝 Add `PunctualityRange` type to `src/types/attendance-payroll.ts`
- [ ] 🔧 `getRanges()` + `updateRanges(ranges)` in `src/services/config.service.ts`
- [ ] 📱 **Punctuality Ranges section** — editable table: min/max seconds, bonus percentage %; save button applies bulk update
- [ ] 📱 Read-only display of current ranges with human-readable labels (e.g., "0 a 9 min → 100%")
- [ ] 🔧 `usePunctualityRanges()` hook — query + bulk-update mutation

---

## 🎯 Acceptance Criteria

- [ ] Admin sees all 5 ranges with their current percentages
- [ ] Admin can edit values and save all ranges in one action
- [ ] After seeder runs, the 5 default SushiGo ranges are populated

---

## 🔗 References

- **Backlog:** AP-024, AP-030 · RF-32

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`
