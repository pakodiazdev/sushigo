# 📝 Task #096: Leave Request — Solicitud Anticipada + Express + Aprobar/Rechazar

## 📖 Story

**Español:**
Como empleado (registrado por el manager en su nombre), quiero solicitar un permiso con anticipación para que el manager pueda aprobarlo o rechazarlo. Para situaciones del mismo día, el manager usa un flujo de aprobación exprés. Al aprobar, los registros de asistencia se ajustan y la vista de Hoy refleja el contexto del permiso.

---

## ⚠️ Nota de arquitectura (segunda pasada)

La primera pasada de este task implementó el flujo de solicitud anticipada directamente sobre `Leave.status = PENDING` (endpoints `/leaves/requests`, `/leaves/{id}/approve|reject`). Al revisar la UX con el usuario se detectó que el código ya tenía un **framework genérico para esto** (`EmployeeRequest` + `RequestHandler`, usado hoy por `EXTRA_DAY`) con `LEAVE` definido en el enum pero nunca conectado — el botón "Permiso" en Solicitudes estaba deshabilitado ("Próximamente"). El enfoque de `Leave.PENDING` era una vía paralela y redundante. Se descartó por completo y se reemplazó por `LeaveRequestHandler` + `POST /employee-requests` (`type=LEAVE`). Ver PR #219 para el detalle final.

## ✅ Backend Tasks

- [x] 🔀 `LeaveRequestHandler` (espeja `ExtraDayRequestHandler`) — materializa un `EmployeeRequest` aprobado en `Leave` + `Attendance`, reutilizando `LeaveGuards`
- [x] 🔧 `POST /api/v1/employee-requests` (`type=LEAVE`) — crea PENDING sin registros de asistencia; soporta `auto_approve` para el caso exprés (sustituye a `/leaves/requests`)
- [x] 🔧 `PATCH /api/v1/employee-requests/{id}/approve|reject` — ya genéricos, omiten el registro de Attendance para permisos `SCHEDULED` (parciales); reject acepta `reason` opcional
- [x] 🐛 `SoftDeletes` en `Leave` — cancelar un permiso aprobado llamaba `forceDelete()`, que solo existe con el trait (espeja `NegotiatedExtraDay`); antes tronaba con 500
- [x] 🗑️ Se eliminó la maquinaria vieja de `Leave.PENDING` (acciones/controladores/rutas/permisos `leaves.request|approve|reject`)
- [x] 🧪 PHPUnit (`LeaveEmployeeRequestApiTest`): submit PENDING, aprobar OPEN_ENDED, aprobar SCHEDULED parcial (sin Attendance, incluso con WORKED existente), auto_approve, rechazar con/sin razón, doble-aprobación 422, cancelar aprobado

## ✅ Frontend Tasks

- [x] ✨ `LeaveRequestForm` con fecha real (start_date/end_date) conectado al botón "Permiso" en Solicitudes — resuelve el bug de fecha hardcodeada a "hoy"
- [x] 🎨 `PendingRequestCard`, `ReviewRequestDialog` (+ `LeaveReviewContent`), `RequestStatusCard` ahora distinguen `LEAVE` de `EXTRA_DAY`
- [x] 🗑️ Se quitó "Solicitar permiso" y los botones Aprobar/Rechazar del tab Ausencias del empleado — el autoservicio vive en Solicitudes; "Registrar" (directo) queda intacto
- [x] 🧪 Cypress E2E: flujo Solicitudes (crear → pendiente → aprobar) + flujo exprés parcial (chip en tarjeta de Hoy, cubierto por `attendance-today-leave-context.cy.ts`)

---

## 🎯 Acceptance Criteria

- [x] Autoservicio de solicitud crea PENDING sin impacto en asistencia (vía Solicitudes, no desde el panel de admin)
- [x] Botón Aprobar crea registros LEAVE para OPEN_ENDED (SCHEDULED no crea registro)
- [x] Botón Rechazar cambia estado a REJECTED (con razón opcional)
- [x] Permiso parcial exprés (PROPORTIONAL_HOURS, aprobado directo) aparece como chip en vista de Hoy (#98)
- [x] No se puede aprobar un permiso ya aprobado (UI oculta botón + API retorna 422)

---

## 🔗 References

- **GitHub Issue:** [#096](https://github.com/pakodiazdev/sushigo/issues/96)
- Depende de: #77 (Leave model), #78 (pestaña Ausencias), #55 (CloseDayAction fix), #98 (leave context en tarjetas)
- Código existente: `Actions/Leaves/`, `Controllers/Api/V1/Leaves/`, `Services/EmployeeRequests/`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `8h` · **Tracked:** `~7h50m`

### 📅 Sessions

```json
[
  { "date": "2026-07-03", "start": "02:25", "end": "08:27" },
  { "date": "2026-07-03", "start": "14:30", "end": "16:16" }
]
```

## 📊 Retrospective
- **Actual total:** ~7h 50m (362 min + 106 min)
- **vs optimistic:** +3h 50m
- **vs pessimistic:** −10m

**Justification:**

Session 1 built the SCHEDULED-vs-OPEN_ENDED Attendance fix and ConfirmDialog UX on top of the existing `Leave.PENDING` flow from PR #100 — most of that scaffolding already existed, so the time went mostly into auditing what PR #103's design rewrite actually changed.

Session 2 was a genuine architecture pivot, prompted by user feedback during manual review ("un admin solicitando permiso para sí mismo no tiene sentido"). Investigating the self-service UX led to discovering the codebase already has a generic `EmployeeRequest` + `RequestHandler` framework with `LEAVE` defined but never wired up — the "Permiso" button in Solicitudes was a disabled placeholder. Building `LeaveRequestHandler`, wiring the frontend form, making the pending/review/status UI type-aware, and removing the now-redundant `Leave.PENDING` machinery amounted to a near-full rewrite of session 1's work, plus a real bug fix found along the way (`Leave` missing `SoftDeletes`, which crashed `EmployeeRequestService::cancel()` on an approved leave). The two sessions combined land just under the pessimistic estimate, but the effort was front-loaded into re-architecting rather than incremental refinement — worth flagging for future estimates when a task references an existing framework ("Services/EmployeeRequests/") without spelling out that it's the intended integration point.
