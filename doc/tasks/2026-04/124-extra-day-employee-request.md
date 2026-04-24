# ➕ Task #124: Extra Day — Employee Self-Request

## 📖 Story

**English:**
As an Employee, I want to request to work on my scheduled day off and propose the terms, so the Manager can review and approve my request.

**Español:**
Como Empleado, quiero solicitar trabajar en mi día de descanso y proponer los términos, para que el Manager pueda revisar y aprobar mi solicitud.

---

## 🧠 Contexto

El empleado inicia la solicitud desde su vista en la webapp (mismo sistema, rol con vista reducida). La solicitud queda **pendiente de aprobación** — el Manager la revisa desde su inbox (#125) y aprueba o rechaza.

Si es aprobada, el día que llegue el check-in fluye automáticamente sin interrupciones.

El empleado solo propone términos — el Manager tiene la última palabra y puede ajustar los montos al aprobar.

---

## 🎨 UI

### Vista del empleado — días de descanso

En la vista personal del empleado su horario semanal muestra los días de descanso con opción de solicitar:

```
  Semana del 20 – 26 abr 2026

  Lun  Mar  Mié  Jue  Vie  Sáb       Dom
   ✓    ✓    ✓    ✓    ✓    ✓    ┌──────────────────┐
                                  │  Día de descanso │
                                  │ [+ Solicitar día │
                                  │     extra]       │
                                  └──────────────────┘
```

### Formulario de solicitud

```
┌─ Solicitar día extra ─────────────────────────── ✕ ┐
│                                                      │
│  Fecha        Domingo 27 abr 2026  ← solo futuras   │
│                                                      │
│  Mi propuesta de prima                               │
│      ┌────────┐      ┌──────────┐                    │
│      │  100   │ %  = │   $200   │                    │
│      └────────┘      └──────────┘                    │
│      Prima legal sugerida: 100%                      │
│      Puedes proponer desde 0% — el Manager decide    │
│                                                      │
│  Nota para el Manager (opcional)                     │
│  ┌──────────────────────────────────────────────┐    │
│  │ Ej: "No tengo planes ese día y me gustaría   │    │
│  │  apoyar"                                     │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ⚠️  Esta solicitud requiere aprobación del Manager  │
│                                                      │
│           [Cancelar]         [Enviar solicitud]      │
└──────────────────────────────────────────────────────┘
```

### Estado de la solicitud

```
  ┌──────────────────────────────────────────────────┐
  │ ➕ Día extra solicitado                           │
  │ Domingo 27 abr 2026  ·  Prima propuesta: 100%    │
  │ ⏳ Pendiente de aprobación                        │
  └──────────────────────────────────────────────────┘

  Una vez respondida:

  ┌──────────────────────────────────────────────────┐
  │ ✅ Aprobado — Domingo 27 abr 2026                │
  │ Prima final: 75%  ·  "Acordado, nos vemos"       │
  └──────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────┐
  │ ❌ Rechazado — Domingo 27 abr 2026               │
  │ "Por ahora no necesitamos personal ese día"      │
  └──────────────────────────────────────────────────┘
```

---

## ✅ Criterios de Aceptación

- [ ] El empleado solo puede solicitar sus propios días de descanso
- [ ] Solo permite fechas futuras
- [ ] La solicitud queda en estado pendiente visible para el empleado
- [ ] El Manager recibe notificación de la solicitud
- [ ] El empleado ve el resultado (aprobado/rechazado) con la nota del Manager
- [ ] Si es aprobada el check-in ese día es automático sin diálogo
- [ ] El empleado puede cancelar su propia solicitud mientras esté en estado `PENDING`
- [ ] Al cancelar, la solicitud pasa a estado `CANCELLED` y desaparece del inbox del Manager
- [ ] No se puede cancelar una solicitud ya `APPROVED` o `REJECTED` desde la vista del empleado

---

## 🔗 Dependencias

### Requiere (debe completarse antes)
- [ ] **#126** — EmployeeRequest base entity (API + modelo base)
- [ ] **#127** — Solicitudes navegación y shell (punto de entrada del formulario)

### Desbloquea (puede iniciarse después)
- [ ] **#125** — Solicitudes listado + filtros (necesita solicitudes reales para mostrar)

### Referencias
- **Viene de:** #059
- **Relacionado:** #122 (exprés), #123 (Manager anticipa), #125 (inbox aprobaciones)

---

## ⏱️ Estimado
- **Optimista:** `3h` · **Pesimista:** `5h`

## ⏱️ Sessions
```json
[]
```
