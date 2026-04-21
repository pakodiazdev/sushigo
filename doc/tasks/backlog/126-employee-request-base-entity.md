# 🔀 Task #126: EmployeeRequest — Base Entity for Approval Workflow

## 📖 Story

**English:**
As a system architect, I need a unified `EmployeeRequest` entity that acts as the approval wrapper for all employee requests (extra days, leaves, vacations, schedule changes), so that the authorization workflow, manager inbox, and employee self-service are unified across all request types.

**Español:**
Como arquitecto del sistema, necesito una entidad unificada `EmployeeRequest` que funcione como wrapper de aprobación para todas las solicitudes de empleados (días extra, permisos, vacaciones, cambios de horario), para que el flujo de autorización, el inbox del manager y el autoservicio del empleado estén unificados en todos los tipos de solicitud.

---

## 🧠 Contexto

Diseñado durante el análisis del #123. Todas las solicitudes de empleados siguen el mismo ciclo de vida:

- El empleado solicita **O** el Manager registra en nombre del empleado
- Cuando el **Manager registra** → auto-aprobado (mismo request, status=approved de inmediato)
- Cuando el **Empleado solicita** → status=pending, el Manager debe aprobar
- La entidad concreta (`NegotiatedExtraDay`, `Leave`, etc.) se crea **únicamente al aprobarse** — la DB queda semánticamente limpia: si existe el registro, está aprobado

---

## 🏗️ Arquitectura

### Tabla `employee_requests`

```
id · employee_id · type (enum) · status
requestable_type (nullable) · requestable_id (nullable) · payload (JSON)
requested_by · approved_by (nullable) · approved_at (nullable) · notes
```

### Relación con entidades concretas

```
EmployeeRequest{pending}
        ↓  al aprobar
NegotiatedExtraDay / Leave / VacationPeriod / ...
  ← requestable_type + requestable_id se asignan aquí
  ← la entidad concreta guarda request_id para trazabilidad
```

### Enum `type`

| Valor | Entidad concreta |
|---|---|
| `EXTRA_DAY` | `NegotiatedExtraDay` |
| `LEAVE` | `Leave` |
| `VACATION` | `VacationPeriod` |
| `SCHEDULE_CHANGE` | `ScheduleChangeRequest` (futuro) |

### Estructura del `payload` JSON por tipo

```json
// EXTRA_DAY
{
  "date": "2026-04-22",
  "salary_pct": 100,
  "prima_pct": 100,
  "salary_day": 200.00,
  "prima_amount": 200.00,
  "seventh_day": 200.00,
  "total": 600.00,
  "branch_id": 1
}
```

### Patrones de creación

| Actor | Flujo |
|---|---|
| Manager registra (anticipado) | Crea `EmployeeRequest` + aprueba inmediatamente → crea `NegotiatedExtraDay` |
| Empleado solicita | Crea `EmployeeRequest{pending}` → aparece en inbox del Manager |
| Manager aprueba | Aprueba `EmployeeRequest` → crea entidad concreta desde payload |

---

## 🔨 Implementación

### Backend (Laravel)

- Migración `employee_requests` table
- Modelo `EmployeeRequest` con relación polimórfica `requestable()` (morphTo)
- Interface `RequestHandler` con método `handle(EmployeeRequest): Model` — una implementación por tipo
  - `ExtraDayRequestHandler`
  - `LeaveRequestHandler` (futuro)
- `EmployeeRequestService`:
  - `create(data, autoApprove: bool)` — crea el request y opcionalmente auto-aprueba
  - `approve(EmployeeRequest, User)` — aprueba, crea entidad concreta, asigna requestable
  - `reject(EmployeeRequest, User, reason)` — rechaza
- Endpoints:
  - `POST /employee-requests` — crear solicitud
  - `PATCH /employee-requests/{id}/approve` — aprobar
  - `PATCH /employee-requests/{id}/reject` — rechazar
  - `GET /employee-requests` — listar (con filtros de tipo/status/empleado)

### Permisos necesarios

- `employee-requests.view`
- `employee-requests.create`
- `employee-requests.approve`

---

## ✅ Criterios de Aceptación

- [ ] Migración crea la tabla `employee_requests` con todos sus campos
- [ ] Modelo `EmployeeRequest` con morphTo `requestable()` y campos tipados
- [ ] `RequestHandler` interface + `ExtraDayRequestHandler` implementado
- [ ] `EmployeeRequestService` maneja creación, auto-aprobación y aprobación manual
- [ ] Al aprobar se crea la entidad concreta desde el payload y se asigna `requestable_type/id`
- [ ] Al rechazar solo cambia el status — no se crea ninguna entidad concreta
- [ ] API endpoints documentados en Swagger
- [ ] PHPUnit: happy path (crear + aprobar), rechazo, duplicado, permisos
- [ ] SonarCloud ≥ 80% en código nuevo

---

## 🔗 Dependencias

### Requiere (debe completarse antes)
> Sin dependencias — es la base del sistema de solicitudes.

### Desbloquea (puede iniciarse después)
- [ ] **#127** — Solicitudes navegación y shell
- [ ] **#123** — Extra day manager advance
- [ ] **#124** — Extra day employee request
- [ ] **#125** — Solicitudes listado + filtros

### Referencias
- **Introduce patrón para:** Leave, Vacation, ScheduleChange

---

## ⏱️ Estimado
- **Optimista:** `3h` · **Pesimista:** `5h`

## ⏱️ Sessions
```json
[]
```
