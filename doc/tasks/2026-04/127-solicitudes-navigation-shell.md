# 📋 Task #127: Solicitudes — Navegación y Shell de Página

## 📖 Story

**English:**
As a user (Manager or Employee), I want a dedicated "Solicitudes" section in the navigation so I can see and submit all types of requests from a single place, with role-aware content depending on who is logged in.

**Español:**
Como usuario (Manager o Empleado), quiero una sección dedicada "Solicitudes" en la navegación para poder ver y enviar todos los tipos de solicitudes desde un solo lugar, con contenido adaptado según el rol del usuario.

---

## 🧠 Contexto

Esta tarea establece la **estructura navegable** de la sección de solicitudes. No implementa los formularios ni el listado completo — eso viene en tareas posteriores. El objetivo es que al hacer merge la sección exista y sea accesible.

**Comportamiento por rol:**
- **Empleado:** ve sus propias solicitudes + botonera con las solicitudes que puede hacer
- **Manager/Admin:** ve todas las solicitudes de su sucursal + botonera para crear en nombre de un empleado + badge con pendientes de aprobación

---

## 🎨 UI

### Menú lateral

```
  🏠 Inicio
  👥 Empleados
  📋 Solicitudes  ← nueva entrada
     └─ badge (3) cuando hay pendientes de aprobación (solo Manager/Admin)
  📦 Inventario
  💰 Caja
```

### Página `/solicitudes`

```
┌─ Solicitudes ──────────────────────────────────────────┐
│                                                          │
│  Nueva solicitud                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ ➕ Día extra │  │ 📅 Permiso   │  │ 🌴 Vacaciones│   │
│  │              │  │  (próximo)   │  │  (próximo)   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  ── Solicitudes ─────────────────────────────────────   │
│                                                          │
│  [Vista del listado — implementado en #125]              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Vista Manager/Admin — tabs adicionales:**

```
  [ Mis solicitudes ]  [ Pendientes de aprobación (3) ]
```

### Estados de botones de la botonera

- `➕ Día extra` — **activo** al completar #123 / #124
- `📅 Permiso` — deshabilitado con tooltip "Próximamente"
- `🌴 Vacaciones` — deshabilitado con tooltip "Próximamente"

---

## 🔧 Implementación

### Ruta nueva
- `/solicitudes` — página principal de solicitudes

### Componentes
- `SolicitudesPage` — página raíz, carga el contexto de rol
- `RequestTypeBar` — botonera de tipos de solicitud (renderiza botones por config)
- `SolicitudesLayout` — layout con tabs para Manager (mis solicitudes / pendientes)

### Navegación
- Agregar entrada al menú lateral con badge reactivo
- Badge muestra `GET /employee-requests?status=PENDING&per_page=1` count (solo usuarios con `employee-requests.approve`)
- Permisos de vista: `employee-requests.view`
- Detección de Manager/Admin: `can('employee-requests.approve')` — no `isAdmin` directo

---

## ✅ Criterios de Aceptación

- [ ] Entrada "Solicitudes" visible en el menú lateral para roles autorizados
- [ ] Badge en el menú muestra conteo de pendientes (solo Manager/Admin)
- [ ] Ruta `/solicitudes` es accesible y renderiza el shell de la página
- [ ] Botonera visible con `+ Día extra` (activo — sin form aún) y demás opciones deshabilitadas con "Próximamente"
- [ ] Layout con tabs en vista Manager (mis solicitudes / pendientes de aprobación)
- [ ] Sin errores de lint ni typecheck

---

## 🔗 Dependencias

### Requiere (debe completarse antes)
- [ ] **#126** — EmployeeRequest base entity (API + modelo base)

### Desbloquea (puede iniciarse después)
- [ ] **#123** — Extra day manager advance (conecta botón + form en botonera)
- [ ] **#124** — Extra day employee request (conecta botón + form en botonera)
- [ ] **#125** — Solicitudes listado + filtros (llena el grid de la página)

---

## ⏱️ Estimado
- **Optimista:** `1.5h` · **Pesimista:** `2.5h`

## ⏱️ Sessions
```json
[]
```
