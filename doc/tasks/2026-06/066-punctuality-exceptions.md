> Archived from [GitHub issue #66](https://github.com/pakodiazdev/sushigo/issues/66) — closed 2026-06-14T03:29:01Z.

# 🚫 Task #066: Manage Punctuality Exceptions per Employee

## 📖 Story

**English:**
As an Admin, I want to force 0% punctuality bonus for specific employee/day combinations (e.g., Andrea on Tue/Wed/Thu), so I can handle special agreements without modifying the general rules.

**Español:**
Como Admin, quiero forzar un 0% de bono de puntualidad para combinaciones específicas de empleado/día (p.ej. Andrea en Mar/Mié/Jue), para manejar acuerdos especiales sin modificar las reglas generales.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_punctuality_exceptions_table` — employee_id (FK), day_of_week (smallint nullable; NULL = all days), forced_percentage (decimal 5,2), effective_from, effective_to (nullable), reason (nullable), timestamps
- [ ] 🔧 `PunctualityException` model — scope `effective(date)`, method `appliesToDay(dayOfWeek): bool`
- [ ] 🌐 `POST /api/v1/employees/{id}/punctuality-exceptions` — CreateExceptionController
- [ ] 🌐 `GET /api/v1/employees/{id}/punctuality-exceptions` — list all exceptions (active + historical)
- [ ] 🧪 Feature tests: create exception, applies to specific day, list

## ✅ Frontend Tasks

- [ ] 📝 Add `PunctualityException` type to `src/types/attendance-payroll.ts`
- [ ] 🔧 `createException(employeeId, data)` + `getExceptions(employeeId)` in `src/services/config.service.ts`
- [ ] 📱 **Exceptions section** in Employee Detail → Configuration tab — list of active exceptions: day (or "todos los días"), forced %, effective range, reason
- [ ] 📱 **Add exception form** — day_of_week selector (Mon–Sun or "All days"), forced_percentage, effective_from, reason
- [ ] 🔧 `usePunctualityExceptions(employeeId)` hook

---

## 🎯 Acceptance Criteria

- [ ] Admin can create an exception forcing 0% (or any %) for a specific day of week
- [ ] Exceptions are listed with their effective date range
- [ ] day_of_week = null applies the exception to all days

---

## 🔗 References

- **Backlog:** AP-026, AP-030 · RF-37

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `3h`

