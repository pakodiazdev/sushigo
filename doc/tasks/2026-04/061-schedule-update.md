# ✏️ Task #061: Pre-fill Schedule Form with Current Values

## 📖 Story

**English:**
As an Admin, when I click "Nuevo horario" to replace an employee's schedule, I want the form pre-filled with the current schedule values (entry/exit times, lunch duration, rest days) and the effective date defaulting to next Monday, so I only need to modify what changes rather than re-entering everything.

**Español:**
Como Admin, al hacer clic en "Nuevo horario" para reemplazar el horario de un empleado, quiero que el formulario venga pre-llenado con los valores del horario actual (horas de entrada/salida, duración de comida, días de descanso) y la fecha de vigencia por defecto al próximo lunes, para solo modificar lo que cambia en lugar de volver a ingresar todo.

> **Note:** The core replacement functionality already works (POST creates new schedule, closes previous automatically via `CreateScheduleAction`). This task adds UX polish by pre-filling the form.

---

## ✅ Backend Tasks

- [x] 🌐 POST `/api/v1/employment-periods/{period}/schedules` — already creates and closes previous ✅
- [x] 🔧 `CreateScheduleAction` already closes previous schedule automatically ✅

## ✅ Frontend Tasks

- [x] 🔧 Add `getNextMonday()` helper — returns next Monday (or today if Monday) in YYYY-MM-DD
- [x] 📝 Extend `CreateScheduleFormProps` to accept `currentSchedule?: EmployeeSchedule`
- [x] 📝 Modify `useCreateScheduleInline` to extract initial values from current schedule:
  - `effective_from` → next Monday
  - `expected_start` → from first working day in current schedule
  - `expected_lunch_start` → from first working day
  - `lunch_duration_minutes` → from first working day
  - `expected_end` → from first working day
  - `dow_X_off` → from current schedule days
- [x] 📱 Pass `schedule` prop from `ScheduleDialog` to `CreateScheduleForm`
- [x] 🧪 Cypress happy path: click "Nuevo horario", verify form is pre-filled, save

---

## 🎯 Acceptance Criteria

- [x] Form date defaults to next Monday (or today if it's Monday)
- [x] Work hours pre-filled from current schedule's first working day
- [x] Rest days pre-filled matching current schedule
- [x] Cypress test validates the happy path flow

---

## 🔗 References

- **Backlog:** AP-011 · RF-08

---

## ⏱️ Estimates

- **Optimistic:** `30min` · **Pessimistic:** `1h`
