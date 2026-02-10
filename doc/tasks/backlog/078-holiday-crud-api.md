# 🌐 Task #078: Holiday CRUD API

## 📖 Story

**English:**
As an Admin, I want to manage the holiday catalog.

**Español:**
Como Admin, quiero gestionar el catálogo de festivos.

---

## ✅ Technical Tasks

- [ ] 🌐 `POST /api/v1/holidays` — CreateHolidayController
- [ ] 🌐 `GET /api/v1/holidays?year=` — ListHolidaysController
- [ ] 🌐 `PUT /api/v1/holidays/{id}` — UpdateHolidayController
- [ ] 🌐 `DELETE /api/v1/holidays/{id}` — DeleteHolidayController
- [ ] 🧪 Feature tests

### 🖥️ Frontend Tasks (webapp)

- [ ] 📱 **Holiday Calendar Page** — route: `/config/holidays`; calendar view or table: date, name, pay_multiplier; grouped by year
- [ ] 📱 **Create Holiday Modal** — fields: date (picker), name, pay_multiplier (default 2.0); duplicate date validation
- [ ] 📱 **Edit / Delete Actions** — inline edit or modal; delete with confirmation
- [ ] 📱 Hooks: `useHolidays(year)`, `useCreateHoliday()`, `useUpdateHoliday()`, `useDeleteHoliday()`
- [ ] 🧪 E2E test: create holiday, edit, delete, verify duplicate rejected

---

## 🎯 Acceptance Criteria

- [ ] CRUD works
- [ ] date unique enforced

---

## 🔗 References

- **Backlog:** AP-057
- RF-29, RF-30
- domain-model.md §2.13

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `2h`
- **Pessimistic:** `3h`
- **Tracked:** ``

### 📅 Sessions

```json
[]
```
