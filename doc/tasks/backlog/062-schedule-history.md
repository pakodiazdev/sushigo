# 🕓 Task #062: Schedule History — Executive View in Dialog

## 📖 Story

**English:**
As an Admin, I want to see the full history of an employee's schedules — including exceptions applied to each — directly from the schedule dialog, so I can audit shift changes over time without leaving the employee detail page.

**Español:**
Como Admin, quiero ver el historial completo de los horarios de un empleado — incluyendo las excepciones aplicadas a cada uno — directamente desde el diálogo de horario, para auditar cambios de turno sin salir del detalle del empleado.

---

## 🧠 Context

The schedule module has two types of change:

1. **New schedule** — replaces the previous one entirely. Only one schedule is active at a time per employment period.
2. **Day override (excepción)** — modifies a specific day without replacing the schedule. Has three scopes: single date, date range, or permanent (indefinite).

The existing "Vista semanal" tab already shows the resolved schedule week by week, but it is operational — not an audit view. This task adds an **executive history view** that shows which schedule was active when, and what exceptions were applied during each schedule's lifetime.

---

## 🎨 UI Design

### What changes in the dialog

The dialog currently shows "Horario activo" as its title and has two tabs: Configuración and Vista Semanal.

After this task:
- Title changes to **"Horarios"**
- A **one-line summary** of the active schedule appears below the title bar
- A new **"Historial" tab** is added as the third tab

```
┌─ Horarios ──────────────────────────────────────── ✕ ┐
│                                                        │
│  🕐 L-V · 1:00 PM–10:00 PM · 🍽 1h · 🏠 Sáb-Dom ⚡+3 │  ← nueva línea resumen
│                                                        │
│  Jornada completa · L-V · 9 días/sem · 45h/sem         │  ← sin cambios
│                                                        │
│  [ Configuración ] [ Vista Semanal ] [ Historial ]     │  ← nueva tab
│  ────────────────────────────────────────────────      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### La línea resumen (nueva)

Condensa toda la info del horario activo en una sola línea: días, horario, duración de comida y días de descanso. Si tiene excepciones activas, muestra un badge `⚡ +N` al final.

```
🕐 L-V · 1:00 PM – 10:00 PM · 🍽 1h · 🏠 Sáb-Dom   ⚡ +3
```

El resumen en el card del detalle de empleado (el que ya existe, multilínea) no cambia.

### Tab "Historial"

Lista de versiones de horario ordenadas por fecha, más reciente primero. Cada fila está **colapsada por defecto**.

```
  ┌────────────────────────────────────────────────────┐
  │ ACTIVO  16 mar 2025 → hoy     ⚡ 3 excepciones  ▶ │
  └────────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────────┐
  │ 01 ene 2025 → 15 mar 2025     ⚡ 1 excepción    ▶ │
  └────────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────────┐
  │ 01 jun 2024 → 31 dic 2024                       ▶ │
  └────────────────────────────────────────────────────┘
```

- El horario activo (`effective_to` vacío) muestra un badge **ACTIVO** en ámbar y "→ hoy" como fecha fin
- Solo se muestra el badge `⚡ N excepciones` si el horario tuvo excepciones
- Singular/plural correcto: "1 excepción", "3 excepciones"

### Fila expandida

Al hacer clic en una fila se despliega el detalle:

```
  ┌────────────────────────────────────────────────────┐
  │ 01 ene 2025 → 15 mar 2025     ⚡ 1 excepción    ▼ │
  │ ──────────────────────────────────────────────── │
  │                                                    │
  │  🕐 L-V · 9:00 PM – 6:00 AM · 🏠 Dom              │  ← resumen de ese horario (una línea)
  │                                                    │
  │  Excepciones (1)                                   │
  │  ● Viernes — Descanso           desde 01 mar 2025  │  ← permanentes primero
  │  ⚡ Lunes  — 10:00 PM – 7:00 AM  10 feb – 28 feb   │  ← temporales después
  │                                                    │
  └────────────────────────────────────────────────────┘
```

- El resumen de una línea corresponde a **ese** horario histórico, no al activo
- Las excepciones permanentes (`●`) aparecen antes que las temporales (`⚡`)
- Si no tiene excepciones, solo se muestra el resumen de una línea
- La sección "Excepciones" no aparece si el horario no tuvo ninguna

### Estados de la tab

```
  Cargando:
  ┌────────────────────────────────────────────────────┐
  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
  └────────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────────┐
  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
  └────────────────────────────────────────────────────┘

  Sin horarios:
  "No hay horarios registrados."
```

Los datos se cargan con **una sola petición** cuando el usuario abre la tab por primera vez. No se hacen peticiones hasta que se activa la tab.

---

## ✅ Backend Tasks

- [ ] 🌐 `GET /api/v1/employment-periods/{id}/schedules` — devuelve todos los horarios del periodo
- [ ] 🔧 Ordenados por `effective_from` DESC; cada horario incluye sus 7 días configurados
- [ ] 🔧 Cada horario incluye solo las excepciones cuya fecha de inicio cae dentro de su rango activo — el backend hace el filtro, no el frontend
- [ ] 🧪 Feature tests: múltiples horarios, lista vacía, excepciones asignadas al horario correcto, sin permiso retorna 403

## ✅ Frontend Tasks

- [ ] 🔧 El resumen de una línea reutiliza el componente de resumen existente con una variante compacta — toda la info en una sola línea
- [ ] 🔧 El badge `⚡ +N` se agrega al final de la línea resumen cuando hay excepciones activas
- [ ] 📝 Título del diálogo cambia de "Horario activo" a "Horarios"
- [ ] 📱 Nueva tab "Historial" como tercera pestaña en el diálogo
- [ ] 📝 Servicio: agregar llamada al nuevo endpoint de historial
- [ ] 📱 Lista de horarios colapsada por defecto, expandible al hacer clic
- [ ] 📱 Estados: carga (skeleton), error, vacío, poblado

---

## 🎯 Acceptance Criteria

- [ ] Título del diálogo muestra "Horarios"
- [ ] La línea resumen aparece debajo de la barra del título cuando hay horario activo
- [ ] Toda la info cabe en una línea; badge `⚡ +N` visible cuando hay excepciones activas
- [ ] La tab "Historial" aparece como tercera pestaña
- [ ] Al abrir la tab se hace una sola petición; no se hace ninguna petición antes
- [ ] Las filas aparecen colapsadas; el horario activo se identifica con badge ACTIVO
- [ ] Al expandir una fila se ve el resumen del horario y sus excepciones
- [ ] Excepciones permanentes aparecen antes que las temporales
- [ ] Las tabs "Configuración" y "Vista Semanal" funcionan igual que antes
- [ ] El resumen multilínea del card de detalle de empleado no cambia

---

## 🔗 References

- **Story:** AP-010 · RF-09
- **Depends on:** #056 (diálogo de horario), #088 (excepciones de día)

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `5h`

---

## ⏱️ Sessions
```json
[]
```
