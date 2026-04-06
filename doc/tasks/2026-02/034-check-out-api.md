# 🚪 Task #034: Register Check-out API

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

### 📱 Frontend Tasks (webapp) — en progreso

#### Check-out individual
- [ ] 📱 **Check-out Button** — aparece en la fila del empleado cuando `lunch_end` existe (regresó de comida) y `check_out` es null
- [ ] 📱 **Check-out Confirmation** — modal con resumen: minutos trabajados, overtime (si hay)
- [ ] 📱 **Overtime Alert** — si `requires_overtime_decision = true` → flujo de autorización (#029)
- [ ] 📱 **Completed State** — fila con ✅ y horas trabajadas totales
- [ ] 📱 Hook: `useCheckOut()` — mutation que devuelve bandera de overtime

#### Cerrar día (wizard multi-paso)
- [ ] 📱 **"Cerrar día" Button** — botón global siempre visible en el Today view
- [ ] 📱 **Wizard modal** con pasos condicionales (solo aparecen si hay empleados en esa situación):

  **Paso 1 — Regresos de comida pendientes** *(si hay empleados con `lunch_start` y sin `lunch_end`)*
  - [ ] 📱 Grid con los empleados que salieron a comer pero no registraron regreso
  - [ ] 📱 Cada fila muestra: nombre, hora de salida a comida, input de hora de regreso
  - [ ] 📱 Hora pre-seleccionada = `lunch_start` + duración de comida del schedule del empleado
  - [ ] 📱 El encargado puede ajustar la hora individualmente si fue diferente

  **Paso 2 — Hora de cierre + resumen** *(siempre visible)*
  - [ ] 📱 Input de hora de cierre (aplica como `check_out` para todos los elegibles)
  - [ ] 📱 Resumen por categorías:
    - **Salida:** empleados con `lunch_end` (o recién completado en paso 1) y sin `check_out`
    - **Falta (ABSENCE):** empleados sin `check_in`
    - *(futuro)* Falta justificada, permiso, vacaciones — preparar UI con secciones vacías, sin lógica aún
  - [ ] 📱 Botón "Confirmar cierre"

- [ ] 📱 **Batch action** — registra `lunch_end` pendientes (paso 1), luego `check_out` masivo, luego marca ABSENCE
- [ ] 📱 **Feedback** — toast con resumen: "X regresos registrados, Y salidas, Z faltas", tabla se actualiza sin reload
- [ ] 📱 Hook: `useCloseDay()` — orquesta los 3 tipos de acción

---

## 🎯 Acceptance Criteria

### Backend (completado ✅)
- [x] `net_worked_minutes` calculado correctamente
- [x] `overtime_minutes` detectado (0 si no hay overtime)
- [x] `requires_overtime_decision = true` cuando `overtime_minutes > 0 && !overtime_authorized`
- [x] Requiere `check_in` existente (422 si no)
- [x] No permite duplicados (422 si ya tiene `check_out`)
- [x] 401 sin token
- [x] 404 si `public_id` no existe

### Frontend (pendiente)
- [ ] Botón de check-out individual visible solo cuando el empleado regresó de comida (`lunch_end` existe) y no tiene `check_out`
- [ ] "Cerrar día" resuelve pendientes en wizard: regresos de comida → hora de cierre → faltas
- [ ] Regresos de comida pendientes pre-calculados con `lunch_start` + duración de comida del schedule
- [ ] Hora de cierre aplica como `check_out` masivo para todos los elegibles
- [ ] Empleados sin `check_in` se marcan automáticamente como ABSENCE
- [ ] Tabla se actualiza sin reload tras check-out individual o masivo
- [ ] Toast con resumen: regresos registrados + salidas + faltas

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
