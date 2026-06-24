# 🎉 Task #080: Manage Holiday Catalog

## 📖 Story

**English:**
As an Admin, I want to manage the official holiday catalog (view, add, update, delete) with a pay multiplier per day, so the payroll close can apply the correct holiday pay.

**Español:**
Como Admin, quiero gestionar el catálogo de días festivos (ver, agregar, actualizar, eliminar) con un multiplicador de pago por día, para que el cierre de nómina aplique el pago correcto en festivos.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_holidays_table` — date (unique), name, pay_multiplier (decimal 4,2 default 2.0), timestamps
- [ ] 🔧 `Holiday` model
- [ ] 🌱 `HolidaySeeder` — 7 official MX 2026 holidays (New Year 1-Jan, Constitution Day 2-Feb, Benito Juárez 16-Mar, Labor Day 1-May, Independence Day 16-Sep, Revolution Day 16-Nov, Christmas 25-Dec)
- [ ] 🔧 `PayrollCalculator::calculateHolidayPay(attendances, holidays, dailyWage)` — if attendance.date ∈ holidays AND status=WORKED → extra_pay = dailyWage × (pay_multiplier − 1)
- [ ] 🌐 `POST /api/v1/holidays` — create
- [ ] 🌐 `GET /api/v1/holidays?year=` — list by year
- [ ] 🌐 `PUT /api/v1/holidays/{id}` — update
- [ ] 🌐 `DELETE /api/v1/holidays/{id}` — delete
- [ ] 🧪 Feature tests: CRUD operations, holiday pay calculation

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/config/holidays.tsx`
- [ ] 📝 Add `Holiday` type to `src/types/attendance-payroll.ts`
- [ ] 🔧 `getHolidays(year)` + `createHoliday(data)` + `updateHoliday(id, data)` + `deleteHoliday(id)` in `src/services/config.service.ts`
- [ ] 📱 **Holiday catalog page** — year selector; table: date, name, pay_multiplier (2× / 3×); inline edit; delete with confirmation
- [ ] 📱 **Add holiday form** — date, name, pay_multiplier selector (2× double, 3× triple)
- [ ] 🔧 `useHolidayManagement(year)` hook

---

## 🎯 Acceptance Criteria

- [ ] Admin sees the 7 default MX 2026 holidays after seeder runs
- [ ] Admin can add, edit, or delete holidays
- [ ] pay_multiplier value is used when calculating holiday pay at payroll close

---

## 🔗 References

- **Backlog:** AP-056, AP-057, AP-058 · RF-29, RF-30, RF-31

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `5h` · **Tracked:** `5h50m`

### 📅 Sessions
```json
[
  { "date": "2026-06-14", "start": "10:00", "end": "14:00" },
  { "date": "2026-06-23", "start": "12:00", "end": "13:50" }
]
```
