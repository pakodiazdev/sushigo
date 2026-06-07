# 🔒 Task #135: Filtrar solicitudes pendientes por sucursal del Manager

## 📖 Story

**Español:**
Como Manager, quiero ver únicamente las solicitudes pendientes de los empleados de mi sucursal, para no mezclar solicitudes de otras sucursales al momento de aprobar o rechazar.

**English:**
As a Manager, I need the pending requests list to be filtered by my branch so I only act on requests from employees I manage.

---

## ✅ Backend Tasks

- [ ] 🔧 Definir cómo el Manager está vinculado a su sucursal (vía `EmploymentPeriod` activo o rol asignado)
- [ ] 🔧 `ListEmployeeRequestsController` — agregar filtro `branch_id` del Manager autenticado cuando el rol es Manager
- [ ] 🔧 `EmployeeRequestService::approve()` — validar que el Manager solo pueda aprobar solicitudes de su propia sucursal (403 si no coincide)
- [ ] 🧪 Feature test: Manager solo ve y puede aprobar solicitudes de su sucursal; Admin ve todas

## ✅ Frontend Tasks

- [ ] 🔧 `usePendingRequests()` — pasar `branch_id` del Manager autenticado en los filtros de la query
- [ ] 🧪 Verificar que la lista no muestra solicitudes de otras sucursales al loguear como Manager

---

## 🎯 Acceptance Criteria

- [ ] Manager autenticado ve únicamente solicitudes PENDING de empleados de su sucursal
- [ ] Manager no puede aprobar solicitudes de otras sucursales (API retorna 403)
- [ ] Admin sigue viendo todas las solicitudes sin filtro de sucursal
- [ ] En MVP (sucursal única) el comportamiento visible es idéntico al actual

---

## 🔗 References

- **GitHub Issue:** [#135](https://github.com/pakodiazdev/sushigo/issues/135)
- Detectado en PR #134 por Copilot review
- Tarea relacionada: #125 (spec original)

---

## ⏱️ Estimates

- **Optimistic:** `2h` · **Pessimistic:** `4h`
