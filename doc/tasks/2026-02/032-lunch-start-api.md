# 🍽️ Task #032: Register Lunch-Start API

> **Nota:** El task original se llamó "Lunch Return API". Tras análisis de UX, se separó en dos endpoints:
> - **#027** (este) — `PATCH {id}/lunch-start` — registra la *salida* a comer
> - **#027b** — `PATCH {id}/lunch-return` — registra el *regreso* (a implementar)

## 📖 Story

**Español:**
Como Manager, quiero registrar la hora de salida a comida del empleado, para poder calcular después la tardanza de regreso.

---

## ✅ Technical Tasks

- [x] 🗄️ Migración `000005`: agregar `lunch_duration_minutes` (smallInt, nullable) a `schedule_days`
- [x] 🔧 `ScheduleDay` model: agregar campo, cast, y método `expectedLunchReturnTime(Carbon)`
- [x] 🏭 `ScheduleDayFactory`: default `lunch_duration_minutes = 60`, estado `withLunchDuration()`, y `dayOff()` lo pone null
- [x] 🌐 `PATCH /api/v1/attendances/{id}/lunch-start` — `RegisterLunchStartController`
- [x] 📝 `LunchStartRequest` — `lunch_start` (requerido, ISO datetime)
- [x] 🔧 `RegisterLunchStartAction` — guarda check_in existe + no duplicado + actualiza `lunch_start`
- [x] 🧪 `LunchStartApiTest`: 8 tests ✅

### 🔮 Decisión de diseño: `lunch_duration_minutes`

En vez de usar `expected_lunch_end` (hora fija en el horario), se usa `lunch_duration_minutes` para calcular dinámicamente la hora esperada de regreso:

```
expected_return = attendance.lunch_start + scheduleDay.lunch_duration_minutes
```

**Ventaja:** Los empleados suelen tener 60 min de comida pero no siempre salen a la misma hora. Al anclar la duración al momento real de salida, el cálculo de tardanza es más justo.

### 📱 Frontend Tasks (mobile) — pendientes

- [ ] 📱 **Lunch Start Button** — aparece en card del empleado solo cuando `check_in` existe pero `lunch_start` es null
- [ ] 📱 **Lunch Start Confirmation** — modal con nombre, hora actual
- [ ] 📱 Hook: `useLunchStart()` — mutation con invalidación de query

---

## 🎯 Acceptance Criteria

- [x] `lunch_start` almacenado en Attendance
- [x] Requiere `check_in` existente (422 si no)
- [x] No permite duplicados (422 si ya tiene `lunch_start`)
- [x] 401 sin token
- [x] 404 si `public_id` no existe

---

## 🔗 References

- **Backlog:** AP-014
- RF-14, RF-15a
- domain-model.md §2.7

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `1.5h`
- **Pessimistic:** `2.5h`
- **Tracked:** `~1.5h`

### 📅 Sessions

```json
[
  {
    "date": "2026-02-23",
    "branch": "feature/019-attendance-audit-log-model"
  }
]
```
