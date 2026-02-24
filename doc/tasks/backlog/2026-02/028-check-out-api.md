# 🚪 Task #028: Register Check-out API

## 📖 Story

**Español:**
Como Manager, quiero registrar la hora de salida del empleado, para que el sistema calcule horas trabajadas y overtime.

---

## ✅ Technical Tasks

- [x] 🌐 `PATCH /api/v1/attendances/{id}/check-out` — `RegisterCheckOutController`
- [x] 📝 `CheckOutRequest` — `check_out` (requerido, ISO datetime)
- [x] 🔧 `RegisterCheckOutAction`:
  - Guard: `check_in` debe existir (422 si no)
  - Guard: `check_out` no debe estar ya registrado (422 si duplicate)
  - `net_worked_minutes = (check_out − check_in) − lunch_duration` (solo si hay ambos: `lunch_start` y `lunch_end`)
  - `overtime_minutes = max(0, check_out − expected_end)` en minutos enteros (floor)
  - Si schedule no se resuelve → `overtime_minutes = 0` (non-blocking)
- [x] 🔧 `Attendance::toApiArray()` — agregado campo `requires_overtime_decision` (true si `overtime_minutes > 0 && !overtime_authorized`)
- [x] 🧪 `CheckOutApiTest`: 10 tests ✅

### 🔮 Cálculos

```
net_worked_minutes = gross_minutes − lunch_minutes   (si lunch_start AND lunch_end registrados)
gross_minutes      = check_out − check_in             (en minutos)
lunch_minutes      = lunch_end − lunch_start          (en minutos)

overtime_minutes   = floor(max(0, check_out − expected_end) / 60)
expected_end       = scheduleDay.expected_end con fecha anclada al día del attendance
```

### 📱 Frontend Tasks (mobile) — pendientes

- [ ] 📱 **Check-out Button** — aparece cuando `check_in` existe y `check_out` es null
- [ ] 📱 **Check-out Confirmation** — modal con resumen: minutos trabajados, overtime (si hay)
- [ ] 📱 **Overtime Alert** — si `requires_overtime_decision = true` → flujo de autorización (#029)
- [ ] 📱 **Completed State** — card con ✅ y horas trabajadas totales
- [ ] 📱 Hook: `useCheckOut()` — mutation que devuelve bandera de overtime

---

## 🎯 Acceptance Criteria

- [x] `net_worked_minutes` calculado correctamente
- [x] `overtime_minutes` detectado (0 si no hay overtime)
- [x] `requires_overtime_decision = true` cuando `overtime_minutes > 0 && !overtime_authorized`
- [x] Requiere `check_in` existente (422 si no)
- [x] No permite duplicados (422 si ya tiene `check_out`)
- [x] 401 sin token
- [x] 404 si `public_id` no existe

---

## 🔗 References

- **Backlog:** AP-015
- RF-12, RF-14, RF-42
- domain-model.md §2.7, sequence §6.2

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `3h`
- **Pessimistic:** `5h`
- **Tracked:** `~1h`

### 📅 Sessions

```json
[
  {
    "date": "2026-02-23",
    "branch": "feature/019-attendance-audit-log-model"
  }
]
```
