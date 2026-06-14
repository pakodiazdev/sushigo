# 💰 Task #064: Configure Punctuality Bonus Groups

## 📖 Story

**English:**
As an Admin, I want to manage punctuality bonus groups (e.g., $110/week ÷ 6 days), so I can define the weekly bonus amounts and daily proration rules.

**Español:**
Como Admin, quiero gestionar los grupos de bono de puntualidad (p.ej. $110/semana ÷ 6 días), para definir los montos semanales y las reglas de prorrateo diario.

---

## ✅ Backend Tasks

- [x] 📂 Migration `create_punctuality_bonus_groups_table` — name (varchar 50), weekly_bonus_amount (decimal 10,2), working_days_divisor (smallint), is_active (bool), timestamps
- [x] 🔧 `PunctualityBonusGroup` model — method `dailyBonusAmount()`: weekly_bonus_amount / working_days_divisor
- [x] 🌱 Seeder: Group $110 (÷6), Group $100 (÷6), Group $50 (÷3)
- [x] 🌐 `GET /api/v1/punctuality/bonus-groups` — list active groups
- [x] 🌐 `POST /api/v1/punctuality/bonus-groups` — create group
- [x] 🧪 Unit test: `dailyBonusAmount()` ($110/6 = $18.33); Feature tests: list, create

## ✅ Frontend Tasks

- [x] 📝 Add `PunctualityBonusGroup` type to `src/types/attendance-payroll.ts`
- [x] 🔧 `getBonusGroups()` + `createBonusGroup(data)` in `src/services/config.service.ts`
- [x] 📱 **Bonus Groups section** on the Punctuality Configuration page (#063) — table: name, weekly amount, divisor, daily amount (computed); "Add group" button opens inline form
- [x] 🔧 `useBonusGroups()` hook — query + create mutation

---

## 🎯 Acceptance Criteria

- [x] Admin sees all active bonus groups with their daily amount calculated
- [x] Admin can create a new group specifying name, weekly amount, and divisor
- [x] Seeder populates the 3 default SushiGo groups

---

## 🔗 References

- **Backlog:** AP-025 · RF-33
- **GitHub duplicate:** #141

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `3h` · **Tracked:** `2h 30m`

### 📅 Sessions
```json
[
  { "date": "2026-04-28", "start": "17:20", "end": "19:52" }
]
```
