# ➕ Task #122: Extra Day — Express Registration (Today View)

## 📖 Story

**English:**
As a Manager, when an employee shows up on their scheduled day off without a prior agreement, I want to be intercepted before registering their check-in so I can negotiate and approve the extra day terms on the spot.

**Español:**
Como Manager, cuando un empleado se presenta en su día de descanso sin acuerdo previo, quiero ser interceptado antes de registrar su entrada para negociar y aprobar los términos del día extra en el momento.

---

## 🧠 Contexto

El empleado llega en su día libre — sin aviso previo. Puede ser porque faltaron compañeros, porque él mismo se ofreció, o cualquier eventualidad. El Manager necesita poder registrar el acuerdo en ese mismo momento antes de que entre al turno.

El acuerdo contempla dos niveles de negociación:
- **Salario del día** — puede ser el registrado o uno acordado (ej. sobrino informal sin salario fijo)
- **Prima por trabajar su descanso** — por ley es el 100% del salario del día, pero puede negociarse desde 0% hasta 200%

Tanto el salario como la prima tienen **inputs duales % ↔ $** — escribir en uno actualiza el otro automáticamente.

El séptimo día (1/6 que ya ganó por sus días trabajados) **siempre se paga** — no es negociable, es automático.

---

## 🎨 UI

### Intercepción en la vista de hoy

Cuando el Manager pulsa **"Registrar entrada"** en el card de un empleado con día de descanso y sin acuerdo previo aprobado, en lugar de registrar directamente aparece el diálogo de negociación.

```
  ┌──────────────────────────────────────┐
  │  Ana García          DAY OFF         │
  │  Cocinera · #0042                    │
  │                                      │
  │  [ Registrar entrada ]  ← intercepta │
  └──────────────────────────────────────┘
```

### Diálogo de negociación

```
┌─ Día extra — Ana García ──────────────────────── ✕ ┐
│                                                      │
│  Fecha        [ 19 abr 2026 ]                        │
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
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│        [Cancelar]    [Aprobar y registrar entrada]   │
└──────────────────────────────────────────────────────┘
```

**Comportamiento esperado:**
- Cambiar % actualiza $ y viceversa — en salario y en prima de forma independiente
- El resumen se recalcula en tiempo real con cada cambio
- Prima legal 100% es el default — el Manager debe cambiarla activamente para pagar menos
- $0 de prima es válido (empleado voluntario informal)
- Al confirmar: acuerdo aprobado + entrada registrada en un solo paso
- Si ya existe acuerdo aprobado para ese día el check-in fluye sin diálogo

---

## ✅ Criterios de Aceptación

- [ ] Registrar entrada en día de descanso sin acuerdo previo muestra el diálogo
- [ ] Salario registrado del empleado aparece como default
- [ ] Cambiar % actualiza $ y viceversa (salario y prima por separado)
- [ ] Prima legal 100% es el default seleccionado
- [ ] $0 de prima es un valor válido
- [ ] El séptimo día aparece en el resumen como automático (no editable)
- [ ] El resumen se actualiza en tiempo real
- [ ] Al aprobar: entrada registrada y día marcado como EXTRA
- [ ] Si ya existe acuerdo aprobado para ese día el check-in fluye sin diálogo

---

## 🔗 Referencias

- **Viene de:** #059
- **Relacionado:** #123 (Manager anticipa), #124 (empleado solicita), #125 (inbox aprobaciones)

---

## ⏱️ Estimado
- **Optimista:** `3h` · **Pesimista:** `5h`

## ⏱️ Sessions
```json
[]
```
