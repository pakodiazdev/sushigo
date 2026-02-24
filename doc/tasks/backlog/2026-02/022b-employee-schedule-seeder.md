# 🌱 Task #022b: EmployeeSchedule Development Seeder

## 📖 Story

**English:**
As a developer, I need schedule data seeded for all active employees in development, so I can test the attendance check-in flow end-to-end without having to create schedules manually via API.

**Español:**
Como desarrollador, necesito datos de horarios sembrados para todos los empleados activos en desarrollo, para poder probar el flujo de registro de asistencia de principio a fin sin necesidad de crear horarios manualmente via API.

---

## 🔗 Relación con tareas existentes

- **Depende de:** #022 (EmployeeSchedule & ScheduleDay models — ✅ completado)
- **Habilita:** #026 (Check-in API) funcional desde la webapp
- **Pendiente:** #023 (Schedule Create API — gestión real de horarios via UI)

---

## ✅ Technical Tasks

- [x] 🌱 `EmployeeScheduleSeeder` — Iterar todos los `EmploymentPeriod` activos y asignar horario
- [x] 🔧 10 templates de horario escalonados (lunch de 15:00 a 20:00, cada 30 min)
- [x] 🔧 Round-robin: cada empleado recibe el template siguiente en la lista
- [x] 🔧 `updateOrCreate` en `ScheduleDay` para idempotencia al re-ejecutar con `--force`
- [x] 🔧 Guard skip-if-exists: si ya hay schedule activo (`effective_to IS NULL`) → omitir
- [x] 🔧 Registrar en `DevelopmentSeeder` después de `EmployeeSeeder`

---

## 🎯 Horario base del restaurante

| Campo | Valor |
|---|---|
| Turno entrada | 13:00 |
| Turno salida | 22:00 |
| Descanso | Domingo (is_day_off = true) |
| Duración comida | 30 minutos |

### Templates escalonados (A–J)

| Template | lunch_start | lunch_end | Nombre del schedule |
|----------|------------|----------|-------------------|
| A | 15:00 | 15:30 | Horario A — {code} |
| B | 15:30 | 16:00 | Horario B — {code} |
| C | 16:00 | 16:30 | Horario C — {code} |
| D | 16:30 | 17:00 | Horario D — {code} |
| E | 17:00 | 17:30 | Horario E — {code} |
| F | 17:30 | 18:00 | Horario F — {code} |
| G | 18:00 | 18:30 | Horario G — {code} |
| H | 18:30 | 19:00 | Horario H — {code} |
| I | 19:00 | 19:30 | Horario I — {code} |
| J | 19:30 | 20:00 | Horario J — {code} |

---

## 🎯 Acceptance Criteria

- [x] Todos los empleados con `EmploymentPeriod` activo reciben exactamente 1 schedule activo
- [x] Cada schedule tiene 7 `ScheduleDay` (dow 1–7), domingo marcado como day_off
- [x] El seeder es idempotente (re-ejecutar con `--force` no duplica datos)
- [x] `POST /attendances/check-in` funciona sin error 422 de horario

---

## 🔗 References

- **Sub-tarea de:** AP-007 (Task #022)
- `app/Models/EmployeeSchedule.php` — scope `effective()`, factory state `current()`
- `app/Models/ScheduleDay.php` — `updateOrCreate` safe
- `app/Enums/WorkdayType.php` — `FULL`
