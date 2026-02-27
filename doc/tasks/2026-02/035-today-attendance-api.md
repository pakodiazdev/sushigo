# 📋 Task #035: Today Attendance View API

## 📖 Story

**Español:**
Como Manager, quiero ver la lista de empleados con su estado de asistencia del día, para operar la captura diaria.

---

## ✅ Technical Tasks

- [x] 🌐 `GET /api/v1/attendances/today?branch_id=` — `TodayAttendanceController`
- [x] 🔧 Query: empleados activos de la sucursal (via `employment_periods.is_active = true`) con eager-load de la asistencia de hoy (LEFT JOIN implícito via Eloquent)
- [x] 🔧 Empleados sin asistencia aparecen con `attendance: null`
- [x] 🔧 Ordenado por `last_name ASC, first_name ASC`
- [x] 🧪 `TodayAttendanceApiTest`: 12 tests ✅

### 🔮 Estructura de respuesta por empleado

```json
{
  "employee": {
    "id": "ULID",
    "code": "EMP001",
    "first_name": "Juan",
    "last_name": "Pérez",
    "roles": ["cook"]
  },
  "attendance": {
    "id": "ULID",
    "check_in": "2026-02-23T09:15:00+00:00",
    "lunch_start": null,
    "lunch_end": null,
    "check_out": null,
    "day_status": "WORKED",
    "entry_late_seconds": 900,
    "entry_late_minutes": 15,
    "is_entry_deductible": false,
    "lunch_late_seconds": 0,
    "lunch_late_minutes": 0,
    "is_lunch_deductible": false,
    "net_worked_minutes": null,
    "overtime_minutes": 0,
    "overtime_authorized": false,
    "requires_overtime_decision": false
  }
}
```

Si el empleado no tiene asistencia registrada: `"attendance": null`

### 📱 Frontend Tasks (mobile — PANTALLA PRINCIPAL) — pendientes

- [ ] 📱 **Today Attendance Screen** — lista de empleados con tarjetas de estado; auto-refresh cada 30s
- [ ] 📱 **Employee Status Card** — avatar/iniciales, nombre, código, badge de rol; estado: ⭕ Sin registro / ⏰ Entrada / 🍜 Comida / ✅ Completado; badge tarde; badge overtime
- [ ] 📱 **Action Buttons per State** — dinámico: Check-in → Lunch Start → Lunch Return → Check-out
- [ ] 📱 **Summary Header** — totales: X llegaron, Y pendientes, Z descanso, W tarde
- [ ] 📱 Hook: `useTodayAttendance(branchId)` — query con intervalo de refetch

### 🖥️ Frontend Tasks (webapp) — pendientes

- [ ] 🖥️ **Today Attendance Page** — tabla: empleado, check_in, lunch_end, check_out, tardanza, overtime, estado
- [ ] 🖥️ **Quick Actions Column** — botones de acción inline por fila

---

## 🎯 Acceptance Criteria

- [x] Todos los empleados activos de la sucursal aparecen
- [x] Empleados sin asistencia muestran `attendance: null`
- [x] Filtrado por sucursal (`branch_id`)
- [x] Ordenado por apellido + nombre
- [x] Empleados de otras sucursales excluidos
- [x] Empleados inactivos excluidos
- [x] 401 sin token
- [x] 422 si `branch_id` falta o no existe

---

## 🔗 References

- **Backlog:** AP-018
- RF-48
- domain-model.md §2.7

---

## ⏱️ Time

### 📊 Estimates

- **Optimistic:** `3h`
- **Pessimistic:** `4h`
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
