# 📥 Task #125: Extra Day — Manager Approval Inbox

## 📖 Story

**English:**
As a Manager, I want an inbox where I can see pending extra day requests from employees, review the proposed terms, and approve or reject each request — adjusting the amounts if needed.

**Español:**
Como Manager, quiero un inbox donde pueda ver las solicitudes de días extra pendientes de mis empleados, revisar los términos propuestos y aprobar o rechazar cada una — ajustando los montos si es necesario.

---

## 🧠 Contexto

Cuando un empleado solicita un día extra (#124) aterriza aquí como pendiente. El Manager revisa, puede ajustar los términos y aprueba o rechaza. El empleado recibe notificación del resultado.

Este inbox es el **punto central de aprobaciones** — en el futuro también recibirá solicitudes de permisos, vacaciones y otros flujos del módulo que sigan el mismo patrón.

---

## 🎨 UI

### Badge de notificación en navegación

```
  📥 Solicitudes  (3)  ← badge visible cuando hay pendientes
```

### Lista del inbox

```
  📥 Solicitudes pendientes  (2)
  ────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────────┐
  │ ➕ Día extra                                      │
  │ Ana García  ·  Dom 27 abr 2026                   │
  │ Prima propuesta: 100%  =  $200                   │
  │ "No tengo planes ese día"          [Revisar →]   │
  └──────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────┐
  │ ➕ Día extra                                      │
  │ Carlos López  ·  Sáb 26 abr 2026                 │
  │ Prima propuesta: 50%  =  $100                    │
  │                                     [Revisar →]  │
  └──────────────────────────────────────────────────┘

  ────────────────────────────────────────────────────
  Sin más solicitudes pendientes
```

### Diálogo de revisión y aprobación

```
┌─ Solicitud de día extra — Ana García ─────────── ✕ ┐
│                                                      │
│  Domingo 27 abr 2026                                 │
│                                                      │
│  Propuesta del empleado                              │
│  Prima: 100%  =  $200                                │
│  "No tengo planes ese día"                           │
│                                                      │
│  ── Términos finales ─────────────────────────────   │
│                                                      │
│  Salario del día                                     │
│    ● Salario registrado              $200            │
│    ○ Salario acordado                                │
│      ┌────────┐      ┌──────────┐                    │
│      │  100   │ %  = │   $200   │                    │
│      └────────┘      └──────────┘                    │
│                                                      │
│  Prima por día de descanso trabajado                 │
│    ● Prima legal   100%  =  $200                     │
│    ○ Prima acordada                                  │
│      ┌────────┐      ┌──────────┐                    │
│      │  100   │ %  = │   $200   │                    │
│      └────────┘      └──────────┘                    │
│      0% mínimo  ·  200% máximo (configurable)        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 💰 Resumen del día                             │  │
│  │    Salario del día          $200               │  │
│  │    Séptimo día (1/6)        $200  ← automático │  │
│  │    Prima                    $200               │  │
│  │    ──────────────────────────────              │  │
│  │    Total                    $600               │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Nota para el empleado (opcional)                    │
│  ┌──────────────────────────────────────────────┐    │
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│        [Rechazar]              [Aprobar acuerdo]     │
└──────────────────────────────────────────────────────┘
```

**Comportamiento esperado:**
- La propuesta del empleado es solo referencia — los términos finales los decide el Manager
- El resumen se actualiza en tiempo real al ajustar salario o prima
- Al aprobar: empleado notificado con términos finales y nota
- Al rechazar: empleado notificado con nota del Manager
- El item desaparece del inbox al aprobar o rechazar
- El badge de navegación se actualiza automáticamente

---

## ✅ Criterios de Aceptación

- [ ] Badge en navegación muestra conteo de pendientes
- [ ] Manager ve todas las solicitudes pendientes de su sucursal
- [ ] Puede ver la propuesta del empleado como referencia
- [ ] Puede ajustar salario y prima antes de aprobar
- [ ] El resumen se actualiza en tiempo real
- [ ] Al aprobar: empleado notificado, item sale del inbox
- [ ] Al rechazar: empleado notificado con nota, item sale del inbox
- [ ] Badge desaparece cuando no hay pendientes

---

## 🔗 Referencias

- **Viene de:** #059
- **Depende de:** #124 (solicitud del empleado)
- **Relacionado:** #122 (exprés), #123 (Manager anticipa)

---

## ⏱️ Estimado
- **Optimista:** `3h` · **Pesimista:** `5h`

## ⏱️ Sessions
```json
[]
```
