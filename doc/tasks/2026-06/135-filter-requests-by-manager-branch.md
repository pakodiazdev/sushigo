# 🔒 Task #135: Filtrar solicitudes pendientes por sucursal del Manager

## 📖 Story

**English:**
As a Manager, I need the pending requests list to be filtered by my branch so I only act on requests from employees I manage.

**Español:**
Como Manager, quiero ver únicamente las solicitudes pendientes de los empleados de mi sucursal, para no mezclar solicitudes de otras sucursales al momento de aprobar o rechazar.

---

## ✅ Backend Tasks

- [x] 🔧 Definir cómo el Manager está vinculado a su sucursal (vía `EmploymentPeriod` activo o rol asignado)
- [x] 🔧 `ListEmployeeRequestsController` — agregar filtro `branch_id` del Manager autenticado cuando el rol es Manager
- [x] 🔧 `EmployeeRequestService::approve()` — validar que el Manager solo pueda aprobar solicitudes de su propia sucursal (403 si no coincide)
- [x] 🧪 Feature test: Manager solo ve y puede aprobar solicitudes de su sucursal; Admin ve todas

## ✅ Frontend Tasks

- [x] 🔧 `usePendingRequests()` — pasar `branch_id` del Manager autenticado en los filtros de la query
- [x] 🧪 Verificar que la lista no muestra solicitudes de otras sucursales al loguear como Manager

---

## 🎯 Acceptance Criteria

- [x] Manager autenticado ve únicamente solicitudes PENDING de empleados de su sucursal
- [x] Manager no puede aprobar solicitudes de otras sucursales (API retorna 403)
- [x] Admin sigue viendo todas las solicitudes sin filtro de sucursal
- [x] En MVP (sucursal única) el comportamiento visible es idéntico al actual

---

## 🔗 References

- **GitHub Issue:** [#135](https://github.com/pakodiazdev/sushigo/issues/135)
- Detectado en PR #134 por Copilot review
- Tarea relacionada: #125 (spec original)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `4h` · **Tracked:** `2h`

### 📅 Sessions
```json
[
  { "date": "2026-06-24", "start": "09:00", "end": "11:00" }
]
```
