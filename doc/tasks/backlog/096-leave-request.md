# 📝 Task #096: Leave Request — Solicitud Anticipada + Express + Aprobar/Rechazar

## 📖 Story

**Español:**
Como empleado (registrado por el manager en su nombre), quiero solicitar un permiso con anticipación para que el manager pueda aprobarlo o rechazarlo. Para situaciones del mismo día, el manager usa un flujo de aprobación exprés. Al aprobar, los registros de asistencia se ajustan y la vista de Hoy refleja el contexto del permiso.

---

## ✅ Backend Tasks

- [ ] 🔧 `POST /api/v1/leaves` — soporte para `submit_as_request = true` (crea PENDING, sin registros de asistencia)
- [ ] 🔧 `PATCH /api/v1/leaves/{id}/approve` — `ApproveLeaveController` (ya existe estructura base)
- [ ] 🔧 `PATCH /api/v1/leaves/{id}/reject` — `RejectLeaveController` con nota opcional (ya existe estructura base)
- [ ] 🧪 PHPUnit: submit PENDING, aprobar OPEN_ENDED, aprobar SCHEDULED parcial, rechazar, doble-aprobación 422

## ✅ Frontend Tasks

- [ ] 🔧 Toggle "Guardar como solicitud" en `RegisterLeaveForm` (#78)
- [ ] 🔧 Botones Aprobar/Rechazar en filas PENDING del tab Ausencias (#78) con `AlertDialog`
- [ ] 🔧 `useLeaveActions(employeeId)` hook — mutations de approve/reject
- [ ] 🧪 Cypress E2E: flujo anticipado (PENDING → APPROVED) + flujo exprés parcial (→ chip en tarjeta de Hoy)

---

## 🎯 Acceptance Criteria

- [ ] Toggle "Guardar como solicitud" crea PENDING sin impacto en asistencia
- [ ] Botón Aprobar solo visible en filas PENDING; crea registros LEAVE para OPEN_ENDED
- [ ] Botón Rechazar solo visible en filas PENDING; cambia estado a REJECTED
- [ ] Permiso parcial exprés (PROPORTIONAL_HOURS, aprobado directo) aparece como chip en vista de Hoy (#98)
- [ ] No se puede aprobar un permiso ya aprobado (UI oculta botón + API retorna 422)

---

## 🔗 References

- **GitHub Issue:** [#096](https://github.com/pakodiazdev/sushigo/issues/96)
- Depende de: #77 (Leave model), #78 (pestaña Ausencias), #55 (CloseDayAction fix), #98 (leave context en tarjetas)
- Código existente: `Actions/Leaves/`, `Controllers/Api/V1/Leaves/`, `Services/EmployeeRequests/`

---

## ⏱️ Estimates

- **Optimistic:** `4h` · **Pessimistic:** `8h`
