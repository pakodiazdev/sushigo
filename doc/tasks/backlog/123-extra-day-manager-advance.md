# ➕ Task #123: Extra Day — Manager Advance Registration

## 📖 Story

**English:**
As a Manager, I want to register a negotiated extra day agreement for an employee in advance, so that when the employee shows up on that day the check-in flows without interruptions.

**Español:**
Como Manager, quiero registrar con anticipación el acuerdo de un día extra para un empleado, para que cuando se presente ese día la entrada fluya sin interrupciones.

---

## 🧠 Contexto

El acuerdo se alcanza antes del día — el Manager lo registra desde el detalle del empleado. Puede ser para mañana, la próxima semana, o incluso retroactivo si se olvidó registrar.

Al registrarlo el Manager queda **auto-aprobado** — no requiere ningún paso adicional.

El día que llega el empleado, el sistema detecta el acuerdo aprobado y el check-in fluye normalmente sin mostrar el diálogo de negociación.

El formulario es idéntico al de #122, con la única diferencia de que la fecha es libre — pasado, hoy o futuro.

---

## 🎨 UI

### Punto de entrada

Botón **"+ Día extra"** en la sección de asistencia del detalle del empleado.

### Formulario

```
┌─ Registrar día extra — Ana García ────────────── ✕ ┐
│                                                      │
│  Fecha   [ 22 abr 2026 ]  ← pasado / hoy / futuro   │
│                                                      │
│  Salario del día                                     │
│    ● Salario registrado              $200            │
│    ○ Salario acordado                                │
│      ┌────────┐      ┌──────────┐                    │
│      │  100   │ %  = │   $200   │                    │
│      └────────┘      └──────────┘                    │
│                                                      │
│  Prima por día de descanso trabajado                 │
│    ● Prima legal   100%  =  $200  ← default          │
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
│  Notas (opcional)                                    │
│  ┌──────────────────────────────────────────────┐    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│           [Cancelar]         [Registrar acuerdo]     │
└──────────────────────────────────────────────────────┘
```

### Confirmación en el detalle del empleado

Después de guardar aparece un chip con el día acordado:

```
  ✅ Día extra acordado · Dom 22 abr · Prima: 100%
```

---

## ✅ Criterios de Aceptación

- [ ] Botón "+ Día extra" visible en el detalle del empleado
- [ ] La fecha acepta pasado, hoy y futuro
- [ ] El acuerdo queda auto-aprobado al guardarlo
- [ ] El detalle del empleado refleja el día extra acordado
- [ ] Cuando el empleado llega ese día el check-in no muestra diálogo
- [ ] Intentar registrar duplicado en la misma fecha muestra error amigable

---

## 🔗 Referencias

- **Viene de:** #059
- **Relacionado:** #122 (exprés), #124 (empleado solicita), #125 (inbox aprobaciones)

---

## ⏱️ Estimado
- **Optimista:** `2h` · **Pesimista:** `3h`

## ⏱️ Sessions
```json
[]
```
