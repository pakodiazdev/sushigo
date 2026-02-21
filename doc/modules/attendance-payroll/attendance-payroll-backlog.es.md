# 📋 Product Backlog — Attendance & Payroll (SushiGo)

**Versión:** 1.0
**Fecha:** 2026-02-09
**Base:** attendance-payroll-spec v0.8 + mvp-scope + domain-model v1.0
**Metodología:** Scrum — historias verticales incrementales

---

## Convenciones

- **ID:** `AP-NNN` (Attendance-Payroll)
- **Formato:** Como [rol], quiero [acción], para [beneficio].
- **Talla:** S (< 1 día), M (1–2 días), L (2–3 días)
- **Prioridad:** P0 (bloqueante), P1 (core MVP), P2 (MVP completo), P3 (post-MVP)
- **Criterios de aceptación (CA):** verificables, uno por línea
- **Trazabilidad:** cada historia referencia los RF/RN/DC que cubre

---

## Épicas

| Épica | Nombre                   | Historias       |
| ----- | ------------------------ | --------------- |
| E1    | Empleados                | AP-001 → AP-006 |
| E2    | Horarios                 | AP-007 → AP-011 |
| E3    | Asistencia diaria        | AP-012 → AP-019 |
| E4    | Permisos parciales       | AP-020 → AP-023 |
| E5    | Puntualidad y bonos      | AP-024 → AP-030 |
| E6    | Días extra negociados    | AP-031 → AP-033 |
| E7    | Banco de horas extra     | AP-034 → AP-039 |
| E8    | Cierre semanal (nómina)  | AP-040 → AP-047 |
| E9    | Permisos (día completo)  | AP-048 → AP-051 |
| E10   | Vacaciones               | AP-052 → AP-055 |
| E11   | Festivos                 | AP-056 → AP-058 |
| E12   | Reportes y exportaciones | AP-059 → AP-063 |
| E13   | Auditoría y permisos     | AP-064 → AP-068 |

---

## E1 — Empleados

### AP-001 · Migración y modelo Employee ✅
**Talla:** M · **Prioridad:** P0 · **RF:** RF-01, RF-02
**Commit:** `3eb59c8` · **Task:** #015

> Como desarrollador, quiero crear la migración y modelo `Employee` con sus campos base, para tener la entidad fundacional del módulo.

**CA:**
- [x] Migración crea tabla `employees` con: id, user_id (FK nullable), code (unique), first_name, last_name, role (enum), is_active, meta (json), timestamps, soft_delete
- [x] Modelo `Employee` con `$fillable`, `$casts`, trait `HasFactory`, `SoftDeletes`
- [x] Enum `EmployeeRole` con valores: MANAGER, COOK, KITCHEN_ASSISTANT, DELIVERY_DRIVER
- [x] Factory genera datos válidos
- [x] Test unitario: creación, soft delete, relación con User

---

### AP-002 · API CRUD de empleados ✅
**Talla:** M · **Prioridad:** P0 · **RF:** RF-01, RF-02
**Commits:** `a234744`, `6f95e7f` · **Task:** #016

> Como Admin, quiero crear, listar, ver, actualizar y desactivar empleados vía API, para gestionar la plantilla.

**CA:**
- [x] `POST /api/v1/employees` — crea empleado (validación de campos requeridos + code unique)
- [x] `GET /api/v1/employees` — lista empleados (filtro `?is_active=`, paginación)
- [x] `GET /api/v1/employees/{id}` — detalle de empleado
- [x] `PUT /api/v1/employees/{id}` — actualiza datos
- [x] `PATCH /api/v1/employees/{id}/toggle-active` — activa/desactiva
- [x] IDs externos con Hashids (nunca exponer incremental)
- [x] Tests feature para cada endpoint (happy path + validaciones)

---

### AP-003 · Migración y modelo EmploymentPeriod
**Talla:** S · **Prioridad:** P0 · **RF:** RF-05, RF-06

> Como desarrollador, quiero crear la migración y modelo `EmploymentPeriod`, para soportar periodos laborales con reingresos.

**CA:**
- [ ] Migración crea tabla `employment_periods`: id, employee_id (FK), branch_id (FK), start_date, end_date (nullable), termination_reason (nullable), is_active, meta, timestamps
- [ ] Modelo con relaciones: `belongsTo(Employee)`, `belongsTo(Branch)`
- [ ] Scope `active()` filtra `is_active = true`
- [ ] Validación a nivel de app: máximo un periodo con `is_active = true` por employee_id
- [ ] Test unitario

---

### AP-004 · API de periodos laborales
**Talla:** M · **Prioridad:** P1 · **RF:** RF-05, RF-06, RF-07

> Como Admin, quiero registrar y consultar periodos laborales de un empleado, para controlar altas, bajas y reingresos.

**CA:**
- [ ] `POST /api/v1/employees/{id}/employment-periods` — crea periodo (valida que no haya otro activo)
- [ ] `GET /api/v1/employees/{id}/employment-periods` — historial de periodos
- [ ] `PATCH /api/v1/employment-periods/{id}/terminate` — cierra periodo (requiere end_date + reason)
- [ ] Error 422 si se intenta crear un periodo activo cuando ya existe uno
- [ ] Tests feature

---

### AP-005 · Migración y modelo WageHistory
**Talla:** S · **Prioridad:** P0 · **RF:** RF-22

> Como desarrollador, quiero crear la migración y modelo `WageHistory`, para registrar la tarifa por hora con historial de vigencias.

**CA:**
- [ ] Migración crea tabla `wage_histories`: id, employee_id (FK), hourly_rate (decimal 10,2), weekly_scheduled_hours (decimal 5,2), effective_from, effective_to (nullable), timestamps
- [ ] Modelo con scope `effective(date)` que filtra por vigencia
- [ ] Método `minuteRate()` → `hourly_rate / 60`
- [ ] Validación: hourly_rate > 0, weekly_scheduled_hours > 0
- [ ] Test unitario

---

### AP-005a · Control de Asignación de Roles y Gestión de Privilegios ✅
**Talla:** M · **Prioridad:** P0 · **RF:** RF-02, RF-17, RF-18
**Commit:** [pendiente] · **Task:** [pendiente]

> Como Admin, quiero restringir la asignación de roles según los privilegios del usuario autenticado, para que solo los super-admins puedan asignar roles de super-admin y mantener la jerarquía de autorización adecuada.

**CA:**
- [x] Agregados `admin` y `super-admin` como roles de posición en `Employee::POSITION_ROLES`
- [x] Implementado método `Employee::getAssignableRolesFor(?User)` que retorna roles permitidos según privilegios del usuario
- [x] Super-admins pueden asignar todos los roles (incluyendo super-admin)
- [x] No-super-admins pueden asignar todos los roles excepto super-admin
- [x] Actualizado `syncPositionRoles($roles, $actingUser)` para aceptar usuario actuante y aplicar restricciones de asignación
- [x] Creado endpoint `GET /api/v1/employees/assignable-roles` que retorna lista dinámica de roles
- [x] Actualizadas todas las validaciones de requests para usar `getAssignableRolesFor()` en lugar de listas estáticas
- [x] Frontend obtiene y muestra solo roles asignables según usuario autenticado
- [x] Actualizados seeders con escenarios realistas (reingresos, bajas, fechas de contratación aleatorias)
- [x] Configurados permisos del rol admin para gestión de usuarios y empleados
- [x] Todos los tests actualizados para reflejar 7 roles de posición (manager, cook, kitchen-assistant, delivery-driver, acting-manager, admin, super-admin)
- [x] Indicadores visuales en UI para roles admin/super-admin

---

### AP-006 · API de historial de sueldo
**Talla:** S · **Prioridad:** P1 · **RF:** RF-22, RF-23

> Como Admin, quiero registrar y consultar el historial de sueldo de un empleado, para tener trazabilidad de incrementos.

**CA:**
- [ ] `POST /api/v1/employees/{id}/wages` — registra nuevo sueldo (cierra vigencia del anterior automáticamente)
- [ ] `GET /api/v1/employees/{id}/wages` — historial de sueldos
- [ ] Al crear un nuevo wage, el anterior se cierra (`effective_to = nuevo.effective_from - 1 día`)
- [ ] Tests feature

---

## E2 — Horarios

### AP-007 · Migración y modelos EmployeeSchedule + ScheduleDay
**Talla:** M · **Prioridad:** P0 · **RF:** RF-08, RF-09, RF-10

> Como desarrollador, quiero crear las migraciones y modelos de horarios, para definir la base de cálculo de puntualidad.

**CA:**
- [ ] Migración `employee_schedules`: id, employment_period_id (FK), name, effective_from, effective_to (nullable), workday_type (enum FULL|PARTIAL), working_days_per_week (default 6), timestamps
- [ ] Migración `schedule_days`: id, employee_schedule_id (FK), day_of_week (1-7 ISO), is_day_off, expected_start (time nullable), expected_lunch_end (time nullable), expected_end (time nullable), timestamps
- [ ] UNIQUE(employee_schedule_id, day_of_week)
- [ ] Modelo `EmployeeSchedule` con `hasMany(ScheduleDay)`, scope `effective(date)`
- [ ] Modelo `ScheduleDay` con métodos `isDayOff()`, `expectedDurationMinutes()`
- [ ] Tests unitarios

---

### AP-008 · API crear horario con días
**Talla:** M · **Prioridad:** P1 · **RF:** RF-08, RF-09

> Como Admin, quiero crear un horario completo para un empleado (7 días), para definir sus tiempos esperados de entrada/comida/salida.

**CA:**
- [ ] `POST /api/v1/employment-periods/{id}/schedules` — crea horario + 7 schedule_days en una sola petición
- [ ] Body incluye array `days[]` con: day_of_week, is_day_off, expected_start, expected_lunch_end, expected_end
- [ ] Validación: si `is_day_off = false`, entonces `expected_start` es requerido
- [ ] Al crear, cierra vigencia del horario anterior (si existe)
- [ ] Test feature: crear horario completo, validaciones

---

### AP-009 · API consultar horario vigente
**Talla:** S · **Prioridad:** P1 · **RF:** RF-08

> Como Manager, quiero consultar el horario vigente de un empleado, para saber sus tiempos esperados.

**CA:**
- [ ] `GET /api/v1/employees/{id}/current-schedule` — retorna horario vigente + sus 7 días
- [ ] 404 si no hay horario vigente
- [ ] Respuesta incluye: nombre del horario, tipo de jornada, días con sus tiempos
- [ ] Test feature

---

### AP-010 · API historial de horarios
**Talla:** S · **Prioridad:** P2 · **RF:** RF-09

> Como Admin, quiero ver el historial de horarios de un empleado, para auditar cambios de turno.

**CA:**
- [ ] `GET /api/v1/employment-periods/{id}/schedules` — lista todos los horarios (vigentes e históricos)
- [ ] Cada horario incluye sus 7 schedule_days
- [ ] Ordenados por `effective_from` descendente
- [ ] Test feature

---

### AP-011 · API actualizar horario vigente
**Talla:** S · **Prioridad:** P2 · **RF:** RF-08

> Como Admin, quiero actualizar los tiempos de un horario vigente, para corregir errores sin crear uno nuevo.

**CA:**
- [ ] `PUT /api/v1/schedules/{id}` — actualiza nombre, workday_type, working_days_per_week + days[]
- [ ] Solo se puede editar si el horario está vigente (effective_to IS NULL)
- [ ] Error 422 si se intenta editar un horario cerrado
- [ ] Test feature

---

## E3 — Asistencia diaria

### AP-012 · Migración y modelo Attendance
**Talla:** M · **Prioridad:** P0 · **RF:** RF-11, RF-12, RF-16

> Como desarrollador, quiero crear la migración y modelo `Attendance`, para almacenar el registro diario de cada empleado.

**CA:**
- [ ] Migración crea tabla `attendances` con todos los campos del domain model (check_in, check_out, lunch_start, lunch_end, entry_late_seconds, lunch_late_seconds, net_worked_minutes, overtime_minutes, overtime_authorized, overtime_authorized_by, overtime_authorized_at, day_status, confirmed_by, meta, timestamps)
- [ ] UNIQUE(employee_id, date), INDEX(date), INDEX(day_status)
- [ ] Enum `DayStatus`: WORKED, DAY_OFF, LEAVE, VACATION, HOLIDAY, ABSENCE, EXTRA
- [ ] Modelo con `$casts` apropiados, relaciones: `belongsTo(Employee)`, scopes por status
- [ ] Tests unitarios

---

### AP-013 · API registrar check-in
**Talla:** M · **Prioridad:** P0 · **RF:** RF-11, RF-13, RF-15a

> Como Manager, quiero registrar la hora de entrada de un empleado, para que el sistema calcule automáticamente su tardanza.

**CA:**
- [ ] `POST /api/v1/attendances/check-in` — body: `{ employee_id, check_in (datetime) }`
- [ ] Crea registro `Attendance` con `day_status = WORKED`
- [ ] Calcula `entry_late_seconds` = max(0, check_in − expected_start) usando el horario vigente
- [ ] Si el empleado ya tiene attendance para esa fecha, error 422
- [ ] Si no hay horario vigente, error 422 con mensaje descriptivo
- [ ] Respuesta incluye: entry_late_seconds, es_deducible (> 1800s)
- [ ] Tests feature: puntual, tarde <30min, tarde >30min, sin horario

---

### AP-014 · API registrar regreso de comida
**Talla:** S · **Prioridad:** P1 · **RF:** RF-14, RF-15a

> Como Manager, quiero registrar la hora de regreso de comida, para calcular tardanza en el regreso.

**CA:**
- [ ] `PATCH /api/v1/attendances/{id}/lunch-return` — body: `{ lunch_end (datetime) }`
- [ ] Calcula `lunch_late_seconds` = max(0, lunch_end − expected_lunch_end)
- [ ] Error 422 si no hay check_in registrado
- [ ] Error 422 si ya hay lunch_end registrado
- [ ] Tests feature: puntual, tarde <30min, tarde >30min

---

### AP-015 · API registrar check-out
**Talla:** M · **Prioridad:** P0 · **RF:** RF-12, RF-14, RF-42

> Como Manager, quiero registrar la hora de salida, para que el sistema calcule horas trabajadas y overtime.

**CA:**
- [ ] `PATCH /api/v1/attendances/{id}/check-out` — body: `{ check_out (datetime) }`
- [ ] Calcula `net_worked_minutes` (check_out − check_in − lunch_duration si aplica)
- [ ] Calcula `overtime_minutes` = max(0, check_out − expected_end) en minutos
- [ ] Error 422 si no hay check_in
- [ ] Respuesta incluye: net_worked_minutes, overtime_minutes, overtime_requires_decision (true si overtime_minutes > 0)
- [ ] Tests feature

---

### AP-016 · API autorizar/rechazar pago de horas extra
**Talla:** M · **Prioridad:** P1 · **RF:** RF-47a, RF-47b, DC-01

> Como Manager, quiero decidir si las horas extra de un día se pagan o no, para controlar el gasto de nómina.

**CA:**
- [ ] `PATCH /api/v1/attendances/{id}/overtime-decision` — body: `{ authorize: true|false }`
- [ ] Si `authorize = true`: marca `overtime_authorized = true`, registra `overtime_authorized_by` y `overtime_authorized_at`
- [ ] Si `authorize = false`: marca `overtime_authorized = false`
- [ ] Solo funciona si `overtime_minutes > 0`
- [ ] Error 422 si ya se tomó una decisión
- [ ] Tests feature: autorizar, rechazar, sin overtime

---

### AP-017 · Cálculo automático de tardanza deducible (>30 min)
**Talla:** S · **Prioridad:** P1 · **RF:** RF-15b, RN-00

> Como sistema, quiero marcar automáticamente las tardanzas >30 min como deducibles, para que el cierre semanal las descuente correctamente.

**CA:**
- [ ] Al registrar check-in: si `entry_late_seconds > 1800`, el campo se almacena correctamente para posterior deducción
- [ ] Al registrar lunch return: si `lunch_late_seconds > 1800`, el campo se almacena correctamente
- [ ] El monto de deducción NO se calcula aquí (se calcula al cierre), solo se registra la evidencia
- [ ] Test unitario: método `isEntryLateDeductible()` y `isLunchLateDeductible()` retornan true cuando > 1800

---

### AP-018 · API consultar asistencia del día (vista "Hoy")
**Talla:** M · **Prioridad:** P1 · **RF:** RF-48

> Como Manager, quiero ver la lista de empleados con su estado de asistencia del día, para operar la captura diaria.

**CA:**
- [ ] `GET /api/v1/attendances/today?branch_id=` — retorna lista de empleados activos de la sucursal con su attendance del día (o null si no tiene)
- [ ] Cada registro incluye: employee (name, role, code), check_in, check_out, lunch_end, day_status, entry_late_seconds, overtime_minutes
- [ ] Empleados sin attendance aparecen con status implícito "sin registro"
- [ ] Ordenados por nombre
- [ ] Tests feature

---

### AP-019 · API marcar día sin asistencia (descanso/falta)
**Talla:** S · **Prioridad:** P1 · **RF:** RF-16

> Como Manager, quiero marcar un día como descanso o falta para un empleado, para que el sistema lo registre sin check-in/out.

**CA:**
- [ ] `POST /api/v1/attendances/day-status` — body: `{ employee_id, date, day_status: DAY_OFF|ABSENCE }`
- [ ] Crea registro `Attendance` sin check_in/check_out, solo con day_status
- [ ] Error 422 si ya existe un attendance para esa fecha
- [ ] Tests feature

---

## E4 — Permisos parciales

### AP-020 · Migración y modelo PartialLeave
**Talla:** S · **Prioridad:** P0 · **RF:** RF-25a

> Como desarrollador, quiero crear la migración y modelo `PartialLeave`, para almacenar permisos parciales.

**CA:**
- [ ] Migración crea tabla `partial_leaves` según domain model
- [ ] Enum `PartialLeaveType`: ARRIVE_LATE, LEAVE_EARLY, TAKE_TIME
- [ ] Modelo con relaciones: `belongsTo(Employee)`, `belongsTo(Attendance)`
- [ ] Validación: duration_minutes > 0
- [ ] Tests unitarios

---

### AP-021 · API registrar permiso parcial
**Talla:** M · **Prioridad:** P1 · **RF:** RF-25a, RN-00c

> Como Manager, quiero registrar un permiso parcial (llegar tarde, salir temprano, tomar tiempo), para documentar la ausencia y su tipo de goce.

**CA:**
- [ ] `POST /api/v1/partial-leaves` — body: `{ employee_id, date, type, is_paid, start_time (opt), end_time (opt), duration_minutes, reason }`
- [ ] `approved_by` se toma del usuario autenticado
- [ ] Si existe attendance del día, se vincula con `attendance_id`
- [ ] Si `start_time` y `end_time` se proporcionan, `duration_minutes` se calcula automáticamente
- [ ] Tests feature: con goce, sin goce, con ventana de tiempo, solo duración

---

### AP-022 · API listar permisos parciales por empleado/fecha
**Talla:** S · **Prioridad:** P1 · **RF:** RF-25a

> Como Manager, quiero consultar los permisos parciales de un empleado en un rango de fechas, para revisar su historial.

**CA:**
- [ ] `GET /api/v1/partial-leaves?employee_id=&date_from=&date_to=` — lista permisos filtrados
- [ ] Incluye: tipo, is_paid, duration_minutes, reason, approved_by (nombre)
- [ ] Paginación
- [ ] Tests feature

---

### AP-023 · Cálculo de deducción por permiso sin goce
**Talla:** S · **Prioridad:** P1 · **RF:** RF-25b, RN-00d

> Como sistema, quiero que los permisos sin goce calculen su deducción exacta minuto a minuto, para que el cierre los descuente correctamente.

**CA:**
- [ ] Método `deductionAmount(minuteRate)` en modelo `PartialLeave`: si `is_paid = false`, retorna `duration_minutes * minuteRate`; si `is_paid = true`, retorna 0
- [ ] Test unitario: permiso sin goce de 45 min con tarifa $2.08/min = $93.60 de deducción
- [ ] Test unitario: permiso con goce de 45 min = $0.00 de deducción

---

## E5 — Puntualidad y bonos

### AP-024 · Migración y modelo PunctualityRange
**Talla:** S · **Prioridad:** P0 · **RF:** RF-32

> Como desarrollador, quiero crear la migración, modelo y seeder de `PunctualityRange`, para configurar los rangos de bono.

**CA:**
- [ ] Migración crea tabla `punctuality_ranges`: id, min_seconds, max_seconds (nullable), bonus_percentage (decimal 5,2), sort_order, timestamps
- [ ] Seeder inserta los 5 rangos default de SushiGo (0-599=100%, 600-899=50%, 900-1259=25%, 1260-1559=10%, 1560+=0%)
- [ ] Modelo con método `matches(lateSeconds): bool`
- [ ] Tests unitarios: cada rango se evalúa correctamente, edge cases (599s, 600s)

---

### AP-025 · Migración y modelo PunctualityBonusGroup + EmployeeBonusConfig
**Talla:** S · **Prioridad:** P0 · **RF:** RF-33, RF-34

> Como desarrollador, quiero crear los modelos de grupos de bono y su asignación a empleados, para soportar el prorrateo.

**CA:**
- [ ] Migración `punctuality_bonus_groups`: id, name, weekly_bonus_amount (decimal 10,2), working_days_divisor, is_active, timestamps
- [ ] Migración `employee_bonus_configs`: id, employee_id (FK), punctuality_bonus_group_id (FK), effective_from, effective_to (nullable), timestamps
- [ ] Seeder: Grupo $110 (÷6), Grupo $100 (÷6), Grupo $50 (÷3)
- [ ] Método `dailyBonusAmount()` en PunctualityBonusGroup = weekly / divisor
- [ ] Tests unitarios

---

### AP-026 · Migración y modelo PunctualityException
**Talla:** S · **Prioridad:** P1 · **RF:** RF-37

> Como desarrollador, quiero crear el modelo de excepciones de puntualidad, para soportar casos como Andrea Mar/Mié/Jue = 0%.

**CA:**
- [ ] Migración `punctuality_exceptions`: id, employee_id (FK), day_of_week (nullable), forced_percentage (decimal 5,2), effective_from, effective_to (nullable), reason (nullable), timestamps
- [ ] Modelo con scope `effective(date)`, método `appliesToDay(dayOfWeek): bool`
- [ ] Tests unitarios

---

### AP-027 · Servicio de cálculo de bono diario de puntualidad
**Talla:** M · **Prioridad:** P1 · **RF:** RF-34, RF-35, RN-01, RN-03, RN-04

> Como sistema, quiero calcular el bono de puntualidad diario de un empleado, para acumular su bono semanal.

**CA:**
- [ ] `PunctualityService::calculateDailyBonus(employee, date, attendance)` retorna el monto del bono diario
- [ ] Obtiene el grupo de bono vigente del empleado → calcula dailyBonusAmount
- [ ] Obtiene los segundos de tardanza del attendance → busca el rango que aplica → obtiene porcentaje
- [ ] Verifica excepciones: si hay excepción vigente para ese día → usa forced_percentage
- [ ] Si day_status = DAY_OFF → retorna 0 (RN-03)
- [ ] Si day_status = EXTRA → retorna 0 (RN-04)
- [ ] Si day_status = ABSENCE → retorna 0
- [ ] Resultado = dailyBonusAmount × percentage
- [ ] Tests: puntual 100%, tarde 50%, día off, extra, con excepción

---

### AP-028 · Servicio de cálculo de bono semanal de puntualidad
**Talla:** S · **Prioridad:** P1 · **RF:** RF-34, RN-02

> Como sistema, quiero sumar los bonos diarios de la semana para obtener el bono semanal de un empleado.

**CA:**
- [ ] `PunctualityService::calculateWeeklyBonus(employee, periodStart, periodEnd)` retorna bono total + desglose diario
- [ ] Itera los días del periodo, calcula bono diario por cada uno, suma
- [ ] Retorna también el array de bonos diarios (para evidencia)
- [ ] Tests: semana completa puntual, semana con días off, semana mixta

---

### AP-029 · Servicio de cálculo de horas libres por puntualidad
**Talla:** S · **Prioridad:** P2 · **RF:** RF-36, RN-05, RN-06, RN-07, RN-08

> Como sistema, quiero calcular las horas libres ganadas por semanas puntuales, para incluirlas en el cierre.

**CA:**
- [ ] `PunctualityService::calculateFreeHours(punctualDays, lastTwoDaysPunctual)` retorna horas ganadas
- [ ] 6 puntuales → 1.0h (fin de semana)
- [ ] 5 puntuales → 1.0h (entre semana)
- [ ] 4 puntuales → 0.5h (entre semana)
- [ ] < 4 puntuales → 0h
- [ ] Validación: si los últimos 2 días del periodo NO son puntuales → 0h (RN-08)
- [ ] Tests para cada caso

---

### AP-030 · API configuración de puntualidad
**Talla:** M · **Prioridad:** P2 · **RF:** RF-32, RF-33, RF-37

> Como Admin, quiero gestionar rangos de puntualidad, grupos de bono y excepciones vía API, para configurar las reglas del negocio.

**CA:**
- [ ] `GET /api/v1/punctuality/ranges` — lista rangos
- [ ] `PUT /api/v1/punctuality/ranges` — actualiza rangos (bulk update)
- [ ] `GET /api/v1/punctuality/bonus-groups` — lista grupos
- [ ] `POST /api/v1/punctuality/bonus-groups` — crea grupo
- [ ] `POST /api/v1/employees/{id}/bonus-config` — asigna grupo a empleado
- [ ] `POST /api/v1/employees/{id}/punctuality-exceptions` — crea excepción
- [ ] `GET /api/v1/employees/{id}/punctuality-exceptions` — lista excepciones
- [ ] Tests feature

---

## E6 — Días extra negociados

### AP-031 · Migración y modelo NegotiatedExtraDay
**Talla:** S · **Prioridad:** P0 · **RF:** RF-38, RF-39

> Como desarrollador, quiero crear la migración y modelo `NegotiatedExtraDay`, para almacenar días extra negociados.

**CA:**
- [ ] Migración crea tabla según domain model, UNIQUE(employee_id, date)
- [ ] Modelo con relaciones: belongsTo(Employee), belongsTo(Branch)
- [ ] Validación: agreed_pay > 0
- [ ] Tests unitarios

---

### AP-032 · API registrar día extra negociado
**Talla:** S · **Prioridad:** P1 · **RF:** RF-38, RF-39, RN-09

> Como Manager, quiero registrar un día extra negociado para un empleado, para documentar el acuerdo de pago.

**CA:**
- [ ] `POST /api/v1/negotiated-extra-days` — body: `{ employee_id, date, branch_id, agreed_pay, notes }`
- [ ] `approved_by` se toma del usuario autenticado
- [ ] Crea/actualiza attendance del día con `day_status = EXTRA`
- [ ] Error 422 si ya existe un extra para ese empleado/fecha
- [ ] Tests feature

---

### AP-033 · API listar días extra negociados
**Talla:** S · **Prioridad:** P2 · **RF:** RF-39

> Como Manager, quiero consultar los días extra negociados de un empleado o periodo, para revisar acuerdos.

**CA:**
- [ ] `GET /api/v1/negotiated-extra-days?employee_id=&date_from=&date_to=` — lista filtrada
- [ ] Incluye: empleado, fecha, pago acordado, aprobado por, notas
- [ ] Tests feature

---

## E7 — Banco de horas extra

### AP-034 · Migración y modelo OvertimeBankMovement
**Talla:** S · **Prioridad:** P0 · **RF:** RF-42, RF-44, RF-45

> Como desarrollador, quiero crear la migración y modelo `OvertimeBankMovement`, para registrar movimientos del banco de horas extra.

**CA:**
- [ ] Migración crea tabla según domain model
- [ ] Enums: OvertimeMovementType (EARNED|USED|PAID|ADJUSTMENT), OvertimeOrigin (AUTO|MANUAL), OvertimeValuationMethod (LFT_PROPORTIONAL|AGREED_RATE)
- [ ] Modelo con relaciones y método `balanceImpact()`: EARNED = +minutes, USED/PAID = −minutes, ADJUSTMENT = ±minutes
- [ ] Tests unitarios

---

### AP-035 · Migración y modelo OvertimePayConfig
**Talla:** S · **Prioridad:** P0 · **RF:** RF-47c, DC-03

> Como desarrollador, quiero crear la migración y modelo `OvertimePayConfig`, para configurar cómo se pagan las horas extra por empleado.

**CA:**
- [ ] Migración crea tabla según domain model
- [ ] Modelo con scope `effective(date)`, método `calculatePay(minutes, dailyWage): decimal`
- [ ] Para LFT_PROPORTIONAL: (dailyWage / 8 / 60) × lft_factor × minutes
- [ ] Para AGREED_RATE: (hourly_rate / 60) × minutes
- [ ] Tests unitarios: ambos métodos con casos reales

---

### AP-036 · Servicio de generación automática de overtime al check-out
**Talla:** M · **Prioridad:** P1 · **RF:** RF-42, RF-43, RF-47a

> Como sistema, quiero generar automáticamente un movimiento EARNED en el banco de horas extra cuando se registra check-out con overtime, para mantener el banco actualizado.

**CA:**
- [ ] Al registrar check-out (AP-015), si `overtime_minutes > 0`, se crea `OvertimeBankMovement` tipo EARNED, origin AUTO
- [ ] El movimiento referencia el attendance_id
- [ ] Si el Manager autoriza pago (AP-016), se crea movimiento PAID con valuation_method, applied_rate, amount calculados desde OvertimePayConfig
- [ ] Si no autoriza, el EARNED queda como histórico
- [ ] Tests: checkout con overtime → EARNED creado; autorización → PAID creado con cálculo correcto

---

### AP-037 · API configurar pago de overtime por empleado
**Talla:** S · **Prioridad:** P1 · **RF:** RF-47c, DC-03

> Como Admin, quiero configurar el método de pago de horas extra para cada empleado, para definir si se paga por LFT o tarifa acordada.

**CA:**
- [ ] `POST /api/v1/employees/{id}/overtime-config` — body: `{ method, hourly_rate (si AGREED_RATE), lft_factor (si LFT_PROPORTIONAL), effective_from }`
- [ ] Al crear, cierra vigencia de la config anterior
- [ ] `GET /api/v1/employees/{id}/overtime-config` — retorna config vigente + historial
- [ ] Tests feature

---

### AP-038 · API consultar balance y movimientos del banco
**Talla:** S · **Prioridad:** P2 · **RF:** RF-46

> Como Manager, quiero consultar el balance y movimientos del banco de horas extra de un empleado, para ver su saldo acumulado.

**CA:**
- [ ] `GET /api/v1/employees/{id}/overtime-bank` — retorna balance (suma de balanceImpact de todos los movimientos)
- [ ] `GET /api/v1/employees/{id}/overtime-bank/movements?date_from=&date_to=` — lista movimientos
- [ ] Balance = Σ(EARNED.minutes) − Σ(USED.minutes) − Σ(PAID.minutes) ± Σ(ADJUSTMENT.minutes)
- [ ] Tests feature

---

### AP-039 · API registrar movimiento manual en banco
**Talla:** S · **Prioridad:** P2 · **RF:** RF-43, RF-44

> Como Admin, quiero registrar un movimiento manual (USED o ADJUSTMENT) en el banco, para canjear tiempo o corregir saldos.

**CA:**
- [ ] `POST /api/v1/employees/{id}/overtime-bank/movements` — body: `{ date, minutes, movement_type (USED|ADJUSTMENT), reason }`
- [ ] origin = MANUAL, authorized_by = usuario autenticado
- [ ] Validación: si USED, el balance resultante no puede ser negativo
- [ ] Tests feature

---

## E8 — Cierre semanal (nómina)

### AP-040 · Migración y modelos PayPeriod + PayPeriodEmployee + PayPeriodLine
**Talla:** M · **Prioridad:** P0 · **RF:** RF-20

> Como desarrollador, quiero crear las migraciones y modelos del cierre semanal, para almacenar el snapshot de nómina.

**CA:**
- [ ] Migración `pay_periods` según domain model, UNIQUE(branch_id, period_start, period_end)
- [ ] Migración `pay_period_employees` según domain model, UNIQUE(pay_period_id, employee_id)
- [ ] Migración `pay_period_lines` según domain model
- [ ] Enum PayPeriodStatus: OPEN, CLOSED, REOPENED
- [ ] Enum PayConcept: BASE_PAY, LATE_DEDUCTION, UNPAID_LEAVE, OVERTIME, EXTRA_DAY, PUNCTUALITY_BONUS, HOLIDAY, OTHER
- [ ] Modelos con relaciones y métodos: `isOpen()`, `isClosed()`, `calculateTotal()`
- [ ] Tests unitarios

---

### AP-041 · Servicio de cálculo de sueldo base del periodo
**Talla:** S · **Prioridad:** P1 · **RF:** RF-22, RF-23

> Como sistema, quiero calcular el sueldo base de un empleado para un periodo, para usarlo como base del cierre.

**CA:**
- [ ] `PayrollCalculator::calculateBasePay(employee, periodStart, periodEnd)` retorna decimal
- [ ] Obtiene el wage vigente (hourly_rate) en el periodo
- [ ] Cuenta los días trabajados (status = WORKED) en el rango y sus horas programadas
- [ ] base_pay = hourly_rate × total de horas programadas de días trabajados
- [ ] Tests: semana completa (6 días), semana con faltas, semana con descansos

---

### AP-042 · Servicio de cálculo de deducciones por tardanza
**Talla:** S · **Prioridad:** P1 · **RF:** RF-15b, RN-00

> Como sistema, quiero calcular el total de deducciones por tardanza >30 min del periodo, para incluirlas en el cierre.

**CA:**
- [ ] `PayrollCalculator::calculateLateDeductions(attendances, minuteRate)` retorna decimal
- [ ] Filtra attendances donde `entry_late_seconds > 1800` → convierte a minutos (floor) → multiplica por minuteRate
- [ ] Filtra attendances donde `lunch_late_seconds > 1800` → misma lógica
- [ ] Suma ambos
- [ ] Tests: sin tardanzas, una entrada tarde, un regreso tarde, ambos en un día

---

### AP-043 · Servicio de cálculo de deducciones por permisos sin goce
**Talla:** S · **Prioridad:** P1 · **RF:** RF-25b, RN-00d

> Como sistema, quiero calcular el total de deducciones por permisos sin goce del periodo.

**CA:**
- [ ] `PayrollCalculator::calculateUnpaidLeaveDeductions(partialLeaves, minuteRate)` retorna decimal
- [ ] Filtra permisos donde `is_paid = false` → suma `duration_minutes × minuteRate`
- [ ] Permisos con goce → $0
- [ ] Tests: sin permisos, 1 sin goce, mixtos

---

### AP-044 · Servicio de cálculo completo del periodo (PayrollCalculator)
**Talla:** L · **Prioridad:** P1 · **RF:** RF-20, RF-49

> Como sistema, quiero orquestar el cálculo completo de un periodo para un empleado, para generar el snapshot con todos los conceptos.

**CA:**
- [ ] `PayrollCalculator::calculateEmployee(employee, periodStart, periodEnd)` retorna array con todos los conceptos
- [ ] Invoca: calculateBasePay, calculateLateDeductions, calculateUnpaidLeaveDeductions, calculateOvertimePay (suma de movements PAID), calculateExtraDayPay (suma de agreed_pay), calculateWeeklyBonus (via PunctualityService), calculateFreeHours
- [ ] Calcula total_pay con la fórmula: base − deducciones + extras + bonos
- [ ] Genera array de daily_snapshot con evidencia por día
- [ ] Genera array de pay_period_lines con cada concepto por día
- [ ] Tests: caso completo con todos los conceptos

---

### AP-045 · API preview del cierre semanal
**Talla:** M · **Prioridad:** P1 · **RF:** RF-20, RF-49

> Como Manager, quiero ver un preview del cierre semanal antes de confirmarlo, para verificar los totales.

**CA:**
- [ ] `GET /api/v1/pay-periods/preview?branch_id=&period_start=&period_end=` — retorna preview sin persistir
- [ ] Ejecuta PayrollCalculator para cada empleado activo de la sucursal en el periodo
- [ ] Respuesta: array de empleados con { base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, total_pay, daily_evidence[] }
- [ ] Tests feature

---

### AP-046 · API confirmar cierre semanal (freeze)
**Talla:** M · **Prioridad:** P1 · **RF:** RF-20, RN-16

> Como Manager, quiero confirmar el cierre de la semana, para congelar los resultados y que no se puedan modificar.

**CA:**
- [ ] `POST /api/v1/pay-periods` — body: `{ branch_id, period_start, period_end }`
- [ ] Ejecuta PayrollCalculator para todos los empleados
- [ ] Crea `PayPeriod` con status = CLOSED, closed_by, closed_at
- [ ] Crea `PayPeriodEmployee` por cada empleado con snapshot de todos los campos
- [ ] Crea `PayPeriodLine` por cada concepto/día
- [ ] Error 422 si ya existe un periodo cerrado para ese rango
- [ ] Tests feature: cierre exitoso, cierre duplicado

---

### AP-047 · API reabrir periodo (Admin + auditoría)
**Talla:** S · **Prioridad:** P2 · **RF:** RF-21, RN-17

> Como Admin, quiero reabrir un periodo cerrado para corregir errores, dejando registro de auditoría.

**CA:**
- [ ] `PATCH /api/v1/pay-periods/{id}/reopen` — body: `{ reason }`
- [ ] Cambia status a REOPENED, registra reopened_by, reopened_at, reopen_reason
- [ ] Solo Admin puede ejecutar
- [ ] `PATCH /api/v1/pay-periods/{id}/reclose` — recalcula y cierra de nuevo
- [ ] Se crea audit log de la reapertura
- [ ] Tests feature: reabrir, recerrar, no-admin rechazado

---

## E9 — Permisos (día completo)

### AP-048 · Migración y modelo LeaveType
**Talla:** S · **Prioridad:** P1 · **RF:** RF-24

> Como desarrollador, quiero crear la migración, modelo y seeder de `LeaveType`, para tener el catálogo de tipos de permiso.

**CA:**
- [ ] Migración crea tabla según domain model, UNIQUE(code)
- [ ] Seeder con tipos base: MEDICAL (con goce), PERSONAL (sin goce), FAMILY_EMERGENCY (con goce)
- [ ] Tests unitarios

---

### AP-049 · Migración y modelo Leave
**Talla:** S · **Prioridad:** P1 · **RF:** RF-25

> Como desarrollador, quiero crear la migración y modelo `Leave`, para almacenar permisos de día completo o rango.

**CA:**
- [ ] Migración crea tabla según domain model
- [ ] Enum LeaveStatus: PENDING, APPROVED, REJECTED, CANCELLED
- [ ] Modelo con relaciones y scopes: `pending()`, `approved()`
- [ ] Tests unitarios

---

### AP-050 · API registrar y aprobar permiso
**Talla:** M · **Prioridad:** P2 · **RF:** RF-25

> Como Manager, quiero registrar un permiso de día(s) completo(s) para un empleado y aprobarlo, para que se refleje en su asistencia.

**CA:**
- [ ] `POST /api/v1/leaves` — body: `{ employee_id, leave_type_id, start_date, end_date, notes }`
- [ ] Se crea con status = PENDING
- [ ] `PATCH /api/v1/leaves/{id}/approve` — aprueba (approved_by, approved_at)
- [ ] `PATCH /api/v1/leaves/{id}/reject` — rechaza
- [ ] Al aprobar, crea/actualiza attendance de los días afectados con `day_status = LEAVE`
- [ ] Tests feature

---

### AP-051 · API listar permisos
**Talla:** S · **Prioridad:** P2 · **RF:** RF-25

> Como Manager, quiero consultar los permisos de un empleado, para revisar su historial.

**CA:**
- [ ] `GET /api/v1/leaves?employee_id=&status=&date_from=&date_to=` — lista con filtros
- [ ] Incluye: tipo de permiso (nombre, is_paid), fechas, status, aprobado por
- [ ] Tests feature

---

## E10 — Vacaciones

### AP-052 · Migración y modelos VacationEntitlement + VacationRequest
**Talla:** S · **Prioridad:** P1 · **RF:** RF-26, RF-27

> Como desarrollador, quiero crear las migraciones y modelos de vacaciones, para gestionar derechos y solicitudes.

**CA:**
- [ ] Migración `vacation_entitlements` según domain model, UNIQUE(employee_id, year)
- [ ] Migración `vacation_requests` según domain model
- [ ] Modelos con relaciones y computed `remainingDays()`
- [ ] Tests unitarios

---

### AP-053 · API gestionar derecho vacacional
**Talla:** S · **Prioridad:** P2 · **RF:** RF-26

> Como Admin, quiero registrar el derecho vacacional anual de un empleado según LFT, para controlar su saldo.

**CA:**
- [ ] `POST /api/v1/employees/{id}/vacation-entitlements` — body: `{ year, entitled_days }`
- [ ] `GET /api/v1/employees/{id}/vacation-entitlements` — historial por año con remaining
- [ ] Error 422 si ya existe registro para ese año
- [ ] Tests feature

---

### AP-054 · API solicitar y aprobar vacaciones
**Talla:** M · **Prioridad:** P2 · **RF:** RF-27, RF-28

> Como Manager, quiero solicitar vacaciones para un empleado y aprobarlas, para que se bloquee la captura de asistencia.

**CA:**
- [ ] `POST /api/v1/vacation-requests` — body: `{ employee_id, start_date, end_date }`
- [ ] Calcula `days_count` automáticamente (excluyendo domingos si aplica o días off según horario)
- [ ] Valida que haya saldo suficiente (entitled − used ≥ days_count)
- [ ] `PATCH /api/v1/vacation-requests/{id}/approve` — aprueba: actualiza used_days, crea attendances con status VACATION
- [ ] `PATCH /api/v1/vacation-requests/{id}/reject` — rechaza
- [ ] RF-28: si se intenta registrar check-in en día de vacaciones aprobadas → error 422
- [ ] Tests feature

---

### AP-055 · API listar solicitudes de vacaciones
**Talla:** S · **Prioridad:** P2 · **RF:** RF-27

> Como Manager, quiero consultar las solicitudes de vacaciones de un empleado.

**CA:**
- [ ] `GET /api/v1/vacation-requests?employee_id=&status=` — lista con filtros
- [ ] Incluye: fechas, days_count, status, aprobado por
- [ ] Tests feature

---

## E11 — Festivos

### AP-056 · Migración y modelo Holiday
**Talla:** S · **Prioridad:** P1 · **RF:** RF-29

> Como desarrollador, quiero crear la migración, modelo y seeder de `Holiday`, para tener el catálogo de festivos.

**CA:**
- [ ] Migración crea tabla según domain model, UNIQUE(date)
- [ ] Seeder con festivos oficiales MX 2026 (Año Nuevo, Constitución, Benito Juárez, Trabajo, Independencia, Revolución, Navidad)
- [ ] Tests unitarios

---

### AP-057 · API CRUD de festivos
**Talla:** S · **Prioridad:** P2 · **RF:** RF-29, RF-30

> Como Admin, quiero gestionar el catálogo de festivos, para definir qué días aplican multiplicador de pago.

**CA:**
- [ ] `POST /api/v1/holidays` — body: `{ date, name, pay_multiplier }`
- [ ] `GET /api/v1/holidays?year=` — lista festivos del año
- [ ] `PUT /api/v1/holidays/{id}` — actualiza
- [ ] `DELETE /api/v1/holidays/{id}` — elimina
- [ ] Tests feature

---

### AP-058 · Cálculo de pago por festivo laborado
**Talla:** S · **Prioridad:** P2 · **RF:** RF-31

> Como sistema, quiero calcular el pago extra cuando un empleado trabaja un día festivo, para incluirlo en el cierre.

**CA:**
- [ ] `PayrollCalculator::calculateHolidayPay(attendances, holidays, dailyWage)` retorna decimal
- [ ] Si attendance.date está en holidays Y day_status = WORKED → pago_extra = dailyWage × (pay_multiplier − 1)
- [ ] Si no trabajó (DAY_OFF) → pago normal, sin extra
- [ ] Tests: trabajó festivo doble, trabajó festivo triple, no trabajó festivo

---

## E12 — Reportes y exportaciones

### AP-059 · API reporte "Hoy" (vista operativa)
**Talla:** M · **Prioridad:** P1 · **RF:** RF-48

> Como Manager, quiero una vista consolidada del día que muestre el estado de cada empleado (llegó/no llegó/tarde/overtime), para la operación diaria.

**CA:**
- [ ] `GET /api/v1/reports/today?branch_id=` — retorna resumen del día
- [ ] Por empleado: name, code, role, status (arrived, not_arrived, late, day_off, on_leave), check_in_time, late_minutes, has_overtime
- [ ] Totales: total_employees, arrived, not_arrived, late_count
- [ ] Tests feature

---

### AP-060 · API reporte resumen semanal por empleado
**Talla:** M · **Prioridad:** P1 · **RF:** RF-49

> Como Manager, quiero consultar el resumen semanal de un empleado con desglose completo, para revisar antes del cierre.

**CA:**
- [ ] `GET /api/v1/reports/weekly-summary?employee_id=&period_start=&period_end=` — retorna desglose
- [ ] Incluye: base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, holiday_pay, total_pay
- [ ] Incluye tabla diaria: date, check_in, check_out, lunch_end, day_status, late_minutes, deducted_minutes, partial_leaves[], overtime_minutes, overtime_paid
- [ ] Si hay periodo cerrado, retorna del snapshot; si no, calcula en vivo
- [ ] Tests feature

---

### AP-061 · API consultar periodo cerrado
**Talla:** S · **Prioridad:** P1 · **RF:** RF-20

> Como Manager, quiero consultar los datos de un periodo cerrado, para ver los resultados congelados.

**CA:**
- [ ] `GET /api/v1/pay-periods/{id}` — retorna periodo + empleados + líneas
- [ ] `GET /api/v1/pay-periods?branch_id=&status=` — lista periodos
- [ ] Incluye totales por empleado y desglose por concepto/día
- [ ] Tests feature

---

### AP-062 · Exportar cierre a CSV
**Talla:** M · **Prioridad:** P2 · **RF:** RF-50

> Como Admin, quiero exportar el cierre semanal a CSV, para procesarlo en hojas de cálculo.

**CA:**
- [ ] `GET /api/v1/pay-periods/{id}/export?format=csv` — descarga CSV
- [ ] Formato: una fila por empleado, columnas: code, name, base_pay, late_deductions, unpaid_leave_deductions, overtime_pay, extra_day_pay, punctuality_bonus, holiday_pay, total_pay
- [ ] Headers UTF-8 BOM para compatibilidad con Excel
- [ ] Tests feature

---

### AP-063 · Exportar cierre a PDF
**Talla:** M · **Prioridad:** P3 · **RF:** RF-50

> Como Admin, quiero exportar el cierre semanal a PDF con desglose completo, para archivo y firma.

**CA:**
- [ ] `GET /api/v1/pay-periods/{id}/export?format=pdf` — descarga PDF
- [ ] Incluye: encabezado (sucursal, periodo, fecha de cierre), tabla resumen por empleado, tabla de evidencia diaria por empleado
- [ ] Generado con librería de PDF (dompdf o similar)
- [ ] Tests feature

---

## E13 — Auditoría y permisos

### AP-064 · Migración y modelo AttendanceAuditLog
**Talla:** S · **Prioridad:** P0 · **RF:** RF-19

> Como desarrollador, quiero crear la migración y modelo de auditoría, para registrar todos los cambios en datos de asistencia.

**CA:**
- [ ] Migración crea tabla según domain model
- [ ] Enum AuditAction: CREATE, UPDATE, DELETE
- [ ] Modelo con relación polimórfica (auditable_type/auditable_id)
- [ ] INDEX(auditable_type, auditable_id)
- [ ] Tests unitarios

---

### AP-065 · Trait de auditoría automática
**Talla:** M · **Prioridad:** P1 · **RF:** RF-19

> Como desarrollador, quiero un trait que registre automáticamente los cambios en modelos auditables, para no repetir lógica.

**CA:**
- [ ] Trait `Auditable` que se agrega a modelos (Attendance, PartialLeave, NegotiatedExtraDay, etc.)
- [ ] Al crear: registra CREATE con new_values
- [ ] Al actualizar: registra UPDATE con old_values y new_values (solo campos que cambiaron)
- [ ] Al eliminar: registra DELETE con old_values
- [ ] El user_id se toma del usuario autenticado
- [ ] Tests: crear attendance → audit log creado; actualizar → log con diff

---

### AP-066 · Restricción de edición: Manager solo día actual
**Talla:** S · **Prioridad:** P1 · **RF:** RF-17

> Como sistema, quiero impedir que un Manager edite asistencias de días anteriores, para proteger la integridad de los datos.

**CA:**
- [ ] Middleware/Policy: si el usuario es Manager y la fecha del attendance ≠ hoy → 403
- [ ] Los endpoints de check-in, check-out, lunch-return, day-status verifican esta regla
- [ ] Tests feature: Manager edita hoy → OK; Manager edita ayer → 403

---

### AP-067 · Edición histórica para Admin (con razón)
**Talla:** S · **Prioridad:** P1 · **RF:** RF-18, RF-19

> Como Admin, quiero poder editar asistencias de días anteriores proporcionando una justificación, para corregir errores.

**CA:**
- [ ] Admin puede editar cualquier fecha
- [ ] El request requiere campo `reason` cuando la fecha < hoy
- [ ] El audit log registra la razón proporcionada
- [ ] Tests feature: Admin edita ayer con reason → OK + audit; Admin edita ayer sin reason → 422

---

### AP-068 · API consultar audit log
**Talla:** S · **Prioridad:** P2 · **RF:** RF-19, RF-50

> Como Admin, quiero consultar el historial de cambios de un registro de asistencia, para auditar modificaciones.

**CA:**
- [ ] `GET /api/v1/audit-logs?auditable_type=&auditable_id=` — lista cambios de un registro
- [ ] `GET /api/v1/audit-logs?employee_id=&date_from=&date_to=` — cambios por empleado/rango
- [ ] Incluye: acción, valores antes/después, usuario, fecha, razón
- [ ] Paginación
- [ ] Tests feature

---

## Matriz de dependencias

```
AP-001 ──→ AP-002
  │
  ├──→ AP-003 ──→ AP-004
  │     │
  │     └──→ AP-007 ──→ AP-008 ──→ AP-009
  │
  ├──→ AP-005 ──→ AP-006
  │
  ├──→ AP-012 ──→ AP-013 ──→ AP-014
  │     │         │          │
  │     │         ├──→ AP-015 ──→ AP-016
  │     │         │                │
  │     │         └──→ AP-017      └──→ AP-036
  │     │                              │
  │     └──→ AP-018                    └──→ AP-034 ──→ AP-035 ──→ AP-037
  │          │
  │          └──→ AP-019
  │
  ├──→ AP-020 ──→ AP-021 ──→ AP-022
  │                │
  │                └──→ AP-023
  │
  ├──→ AP-024 ──→ AP-025 ──→ AP-026 ──→ AP-027 ──→ AP-028 ──→ AP-029
  │
  ├──→ AP-031 ──→ AP-032 ──→ AP-033
  │
  ├──→ AP-040 ──→ AP-041 ──→ AP-042 ──→ AP-043 ──→ AP-044 ──→ AP-045 ──→ AP-046 ──→ AP-047
  │
  ├──→ AP-048 ──→ AP-049 ──→ AP-050 ──→ AP-051
  │
  ├──→ AP-052 ──→ AP-053 ──→ AP-054 ──→ AP-055
  │
  ├──→ AP-056 ──→ AP-057 ──→ AP-058
  │
  └──→ AP-064 ──→ AP-065 ──→ AP-066 ──→ AP-067 ──→ AP-068
```

---

## Sugerencia de sprints (2 semanas cada uno)

### Sprint 1 — Fundaciones (modelos + CRUD empleados)
| ID     | Historia                              | Talla | Prio |
| ------ | ------------------------------------- | ----- | ---- |
| AP-001 | Migración y modelo Employee           | M     | P0   |
| AP-002 | API CRUD de empleados                 | M     | P0   |
| AP-003 | Migración y modelo EmploymentPeriod   | S     | P0   |
| AP-004 | API de periodos laborales             | M     | P1   |
| AP-005 | Migración y modelo WageHistory        | S     | P0   |
| AP-006 | API historial de sueldo               | S     | P1   |
| AP-064 | Migración y modelo AttendanceAuditLog | S     | P0   |

### Sprint 2 — Horarios + Asistencia básica
| ID     | Historia                        | Talla | Prio |
| ------ | ------------------------------- | ----- | ---- |
| AP-007 | Migración y modelos Schedule    | M     | P0   |
| AP-008 | API crear horario con días      | M     | P1   |
| AP-009 | API consultar horario vigente   | S     | P1   |
| AP-012 | Migración y modelo Attendance   | M     | P0   |
| AP-013 | API registrar check-in          | M     | P0   |
| AP-014 | API registrar regreso de comida | S     | P1   |
| AP-015 | API registrar check-out         | M     | P0   |

### Sprint 3 — Decisiones de overtime + Permisos parciales
| ID     | Historia                                  | Talla | Prio |
| ------ | ----------------------------------------- | ----- | ---- |
| AP-016 | API autorizar/rechazar pago HE            | M     | P1   |
| AP-017 | Cálculo automático tardanza deducible     | S     | P1   |
| AP-018 | API consultar asistencia del día          | M     | P1   |
| AP-019 | API marcar día sin asistencia             | S     | P1   |
| AP-020 | Migración y modelo PartialLeave           | S     | P0   |
| AP-021 | API registrar permiso parcial             | M     | P1   |
| AP-022 | API listar permisos parciales             | S     | P1   |
| AP-023 | Cálculo de deducción por permiso sin goce | S     | P1   |

### Sprint 4 — Puntualidad + Días extra
| ID     | Historia                                | Talla | Prio |
| ------ | --------------------------------------- | ----- | ---- |
| AP-024 | Migración y modelo PunctualityRange     | S     | P0   |
| AP-025 | Migración y modelo BonusGroup + Config  | S     | P0   |
| AP-026 | Migración y modelo PunctualityException | S     | P1   |
| AP-027 | Servicio cálculo bono diario            | M     | P1   |
| AP-028 | Servicio cálculo bono semanal           | S     | P1   |
| AP-031 | Migración y modelo NegotiatedExtraDay   | S     | P0   |
| AP-032 | API registrar día extra negociado       | S     | P1   |
| AP-065 | Trait de auditoría automática           | M     | P1   |

### Sprint 5 — Banco de overtime + Cierre semanal
| ID     | Historia                                       | Talla | Prio |
| ------ | ---------------------------------------------- | ----- | ---- |
| AP-034 | Migración y modelo OvertimeBankMovement        | S     | P0   |
| AP-035 | Migración y modelo OvertimePayConfig           | S     | P0   |
| AP-036 | Servicio generación automática overtime        | M     | P1   |
| AP-037 | API configurar pago overtime                   | S     | P1   |
| AP-040 | Migraciones modelos PayPeriod                  | M     | P0   |
| AP-041 | Servicio cálculo sueldo base                   | S     | P1   |
| AP-042 | Servicio cálculo deducciones tardanza          | S     | P1   |
| AP-043 | Servicio cálculo deducciones permisos sin goce | S     | P1   |

### Sprint 6 — Motor de cierre completo
| ID     | Historia                                      | Talla | Prio |
| ------ | --------------------------------------------- | ----- | ---- |
| AP-044 | Servicio cálculo completo (PayrollCalculator) | L     | P1   |
| AP-045 | API preview cierre semanal                    | M     | P1   |
| AP-046 | API confirmar cierre (freeze)                 | M     | P1   |
| AP-059 | API reporte "Hoy"                             | M     | P1   |
| AP-060 | API reporte resumen semanal                   | M     | P1   |
| AP-061 | API consultar periodo cerrado                 | S     | P1   |
| AP-066 | Restricción edición Manager solo hoy          | S     | P1   |
| AP-067 | Edición histórica Admin con razón             | S     | P1   |

### Sprint 7 — Completar MVP + Post-MVP
| ID     | Historia                        | Talla | Prio |
| ------ | ------------------------------- | ----- | ---- |
| AP-029 | Servicio cálculo horas libres   | S     | P2   |
| AP-030 | API config puntualidad          | M     | P2   |
| AP-033 | API listar días extra           | S     | P2   |
| AP-038 | API balance overtime bank       | S     | P2   |
| AP-039 | API movimiento manual banco     | S     | P2   |
| AP-047 | API reabrir periodo             | S     | P2   |
| AP-048 | Migración y modelo LeaveType    | S     | P1   |
| AP-049 | Migración y modelo Leave        | S     | P1   |
| AP-050 | API registrar y aprobar permiso | M     | P2   |
| AP-056 | Migración y modelo Holiday      | S     | P1   |

### Sprint 8 — Vacaciones, festivos, exports
| ID     | Historia                           | Talla | Prio |
| ------ | ---------------------------------- | ----- | ---- |
| AP-010 | API historial horarios             | S     | P2   |
| AP-011 | API actualizar horario             | S     | P2   |
| AP-051 | API listar permisos                | S     | P2   |
| AP-052 | Migraciones vacaciones             | S     | P1   |
| AP-053 | API derecho vacacional             | S     | P2   |
| AP-054 | API solicitar y aprobar vacaciones | M     | P2   |
| AP-055 | API listar solicitudes vacaciones  | S     | P2   |
| AP-057 | API CRUD festivos                  | S     | P2   |
| AP-058 | Cálculo pago festivo laborado      | S     | P2   |
| AP-062 | Exportar cierre a CSV              | M     | P2   |
| AP-068 | API consultar audit log            | S     | P2   |

### Sprint 9 (Post-MVP)
| ID     | Historia              | Talla | Prio |
| ------ | --------------------- | ----- | ---- |
| AP-063 | Exportar cierre a PDF | M     | P3   |

---

## Trazabilidad RF → Historias

| RF                                | Historias                                              |
| --------------------------------- | ------------------------------------------------------ |
| RF-01, RF-02                      | AP-001, AP-002                                         |
| RF-03                             | AP-003, AP-004                                         |
| RF-04                             | AP-060                                                 |
| RF-05, RF-06, RF-07               | AP-003, AP-004                                         |
| RF-08, RF-09, RF-10               | AP-007, AP-008, AP-009, AP-010, AP-011                 |
| RF-11                             | AP-012, AP-013                                         |
| RF-12                             | AP-012, AP-015                                         |
| RF-13                             | AP-013, AP-017                                         |
| RF-14                             | AP-014, AP-015                                         |
| RF-15, RF-15a, RF-15b             | AP-013, AP-014, AP-017                                 |
| RF-16                             | AP-012, AP-019                                         |
| RF-17                             | AP-066                                                 |
| RF-18                             | AP-067                                                 |
| RF-19                             | AP-064, AP-065, AP-067, AP-068                         |
| RF-20                             | AP-040, AP-046, AP-061                                 |
| RF-21                             | AP-047                                                 |
| RF-22, RF-23                      | AP-005, AP-006, AP-041                                 |
| RF-24                             | AP-048                                                 |
| RF-25, RF-25a, RF-25b, RF-25c     | AP-020, AP-021, AP-022, AP-023, AP-049, AP-050, AP-051 |
| RF-26                             | AP-052, AP-053                                         |
| RF-27, RF-28                      | AP-054, AP-055                                         |
| RF-29, RF-30, RF-31               | AP-056, AP-057, AP-058                                 |
| RF-32                             | AP-024, AP-030                                         |
| RF-33, RF-34                      | AP-025, AP-030                                         |
| RF-35                             | AP-027                                                 |
| RF-36                             | AP-029                                                 |
| RF-37                             | AP-026, AP-030                                         |
| RF-38, RF-39, RF-40, RF-41        | AP-031, AP-032, AP-033                                 |
| RF-42, RF-43, RF-44, RF-45, RF-46 | AP-034, AP-036, AP-038, AP-039                         |
| RF-47, RF-47a, RF-47b, RF-47c     | AP-016, AP-035, AP-036, AP-037                         |
| RF-48                             | AP-018, AP-059                                         |
| RF-49                             | AP-044, AP-045, AP-060                                 |
| RF-50                             | AP-062, AP-063, AP-068                                 |

---

> **68 historias** · **13 épicas** · **~8 sprints MVP** + 1 post-MVP
> Cobertura: 100% de los RF (RF-01 a RF-50), RN y DC del spec v0.8
