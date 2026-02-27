# 🍽️ Task #033: Register Lunch-Return API

> Complemento de [#027 lunch-start](./027-lunch-start-api.md). Registra el regreso de comida y calcula la tardanza.

## 📖 Story

**Español:**
Como Manager, quiero registrar la hora de regreso de comida del empleado, para calcular si hubo tardanza en el regreso.

---

## ✅ Technical Tasks

- [x] 🌐 `PATCH /api/v1/attendances/{id}/lunch-return` — `RegisterLunchReturnController`
- [x] 📝 `LunchReturnRequest` — `lunch_end` (requerido, ISO datetime)
- [x] 🔧 `RegisterLunchReturnAction`:
  - Guard: `lunch_start` debe existir (422 si no)
  - Guard: `lunch_end` no debe estar ya registrado (422 si duplicate)
  - Resuelve schedule → `scheduleDay.expectedLunchReturnTime(lunch_start)` → calcula tardanza
  - Si schedule no se resuelve → `lunch_late_seconds = 0` (no bloquear el flujo)
- [x] 🧪 `LunchReturnApiTest`: 9 tests ✅

### 🔮 Lógica de cálculo

```
expected_return = attendance.lunch_start + scheduleDay.lunch_duration_minutes
lunch_late_seconds = max(0, lunch_end − expected_return)
```

**Deductible:** `lunch_late_seconds > 1800` (más de 30 minutos exactos).

### 📱 Frontend Tasks (mobile) — pendientes

- [ ] 📱 **Lunch Return Button** — aparece solo cuando `lunch_start` existe pero `lunch_end` es null
- [ ] 📱 **Lunch Late Indicator** — muestra minutos de tardanza si `lunch_late_seconds > 0`
- [ ] 📱 Hook: `useLunchReturn()` — mutation con invalidación de query

---

## 🎯 Acceptance Criteria

- [x] `lunch_end` y `lunch_late_seconds` almacenados en Attendance
- [x] Requiere `lunch_start` existente (422 si no)
- [x] No permite duplicados (422 si ya tiene `lunch_end`)
- [x] Cálculo correcto: on-time=0, <30min=no deductible, >30min=deductible
- [x] 401 sin token
- [x] 404 si `public_id` no existe

---

## 🔗 References

- **Backlog:** AP-014
- RF-14, RF-15a
- domain-model.md §2.7
- Task #027 (lunch-start) — prerequisito

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `1h`
- **Pessimistic:** `2h`
- **Tracked:** `~45min`

### 📅 Sessions

```json
[
  {
    "date": "2026-02-23",
    "branch": "feature/019-attendance-audit-log-model"
  }
]
```
