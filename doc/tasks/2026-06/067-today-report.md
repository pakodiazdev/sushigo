# 📊 Task #067: View Today's Operational Report

## 📖 Story

**English:**
As a Manager, I want a consolidated view of today's attendance showing each employee's status, tardiness, and overtime flags, so I can quickly assess the operational situation without opening individual records.

**Español:**
Como Manager, quiero una vista consolidada de la asistencia del día con el estado de cada empleado, sus tardanzas e indicadores de horas extra, para evaluar rápidamente la situación operativa sin abrir registros individuales.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/reports/today?branch_id=` — TodayReportController
- [ ] 🔧 Per employee: name, code, role, status (arrived/not_arrived/late/day_off/on_leave), check_in_time, late_minutes, has_overtime, overtime_authorized
- [ ] 🔧 Summary totals: total_employees, arrived, not_arrived, late_count
- [ ] 🧪 Feature tests: mixed statuses, empty branch

## ✅ Frontend Tasks

- [ ] 📂 Create route `src/pages/attendance/reports/today.tsx`
- [ ] 🔧 `getTodayReport(branchId)` in `src/services/report.service.ts`
- [ ] 📱 **Today report page** — summary cards at top (total / arrived / not arrived / late); employee table below
- [ ] 📱 **Status badge per employee** — color-coded: verde "A tiempo", amarillo "Tardanza X min", rojo "No registrado", gris "Descanso/Permiso"
- [ ] 📱 Overtime indicator column — flag icon when employee has overtime pending decision
- [ ] 🔧 `useTodayReport(branchId)` hook — auto-refresh every 2 minutes

---

## 🎯 Acceptance Criteria

- [ ] Manager sees all active branch employees with their current status
- [ ] Summary cards reflect accurate totals
- [ ] Page refreshes automatically to reflect new check-ins without manual reload

---

## 🔗 References

- **Backlog:** AP-059 · RF-48

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `5h` · **Tracked:** `12h 34m`

### 📅 Sessions
```json
[
  { "date": "2026-06-14", "start": "00:08", "end": "02:17" },
  { "date": "2026-06-14", "start": "10:06", "end": "15:46" },
  { "date": "2026-06-14", "start": "16:05", "end": "20:13" },
  { "date": "2026-06-15", "start": "01:43", "end": "02:00" },
  { "date": "2026-06-15", "start": "10:55", "end": "11:15" }
]
```

## 📊 Desviación
- **Total real:** 12h 34m (129 min + 340 min + 248 min + 17 min + 20 min)
- **Diferencia vs optimista:** +9h 34m
- **Diferencia vs pesimista:** +7h 34m

**Justificación:**

El endpoint y la página básica estuvieron listos dentro del estimado optimista. La desviación se explica por cuatro factores no contemplados al estimar:

1. **Iteraciones de PR review (≈6h):** Se recibieron múltiples rondas de feedback — cuatro observaciones de Copilot (fix de `late_minutes`, cast de Carbon, comentario de tipo TypeScript, race condition en Cypress) y cuatro observaciones del author (extraer lógica a `TodayReportService`, consulta a `EmployeeRepository`, formato de respuesta a `TodayReportResponse`, schema Swagger a la clase response, sub-componentes a archivos independientes). Cada ronda requirió implementación, lint, commit y re-push.

2. **Estado `rest_day` no contemplado en el alcance original (≈1h):** Durante pruebas manuales se detectó que empleados con día de descanso programado (`ScheduleDay.is_day_off = true`) aparecían como "No registrado" en lugar de "Día de descanso". Resolver esto requirió eager-loading de la cadena `EmploymentPeriod → EmployeeSchedule (scope effective) → ScheduleDay` filtrada por día ISO de la semana.

3. **SonarCloud quality gate (≈1h):** El gate falló en cobertura y code smells en webapp y api, requiriendo una sesión de revisión y corrección dedicada antes de poder continuar con el PR review.

4. **E2E con seeder determinístico para los 6 estados (≈1h):** Crear `TodayReportStatusSeeder` con empleados determinísticos para cada estado y depurar el fallo de `scrollIntoView` en Cypress para filas fuera del viewport tomó más de lo esperado para una spec E2E estándar.
