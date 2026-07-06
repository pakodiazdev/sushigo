# ⚙️ Task #228: Overtime Valuation — Global LFT Tiers + Decision-Time Method Selection

## 📖 Story

**English:**
As an Admin, when I authorize payment for overtime worked outside the schedule, I want to choose whether it's valued per LFT (using a system-wide tier table of factor/hour-threshold that survives future law changes) or a rate negotiated for that specific case, so the payment reflects the real agreement instead of a pre-set default that may not apply.

**Español:**
Como Admin, al autorizar el pago de horas extra fuera de horario, quiero elegir si se valora según LFT (usando una tabla de tramos factor/tope-de-horas configurable a nivel sistema, que resista cambios futuros a la ley) o con una tarifa pactada para ese caso puntual, para que el pago refleje el acuerdo real en vez de un default preconfigurado que puede no aplicar.

---

## ✅ Backend Tasks

- [ ] 📂 Migration `create_overtime_lft_tiers_table` — `factor` (decimal), `up_to_hours` (decimal nullable, null = sin tope/de ahí en adelante), `sort_order`, timestamps (mismo patrón que `PunctualityRange`)
- [ ] 🔧 `OvertimeLftTier` model — método `matches(hours)`, resolución del tramo aplicable dado el acumulado semanal
- [ ] 🌐 `GET /api/v1/overtime/lft-tiers` — lista de tramos vigentes
- [ ] 🌐 `PUT /api/v1/overtime/lft-tiers` — reemplazo completo (mismo patrón que `UpdatePunctualityRangesController`)
- [ ] 🔨 Extender `OvertimeDecisionRequest` — cuando `authorize=true`, exigir `valuation_method` (`LFT_PROPORTIONAL`|`AGREED_RATE`) y, según el método, `agreed_rate` (si `AGREED_RATE`) o nada (si `LFT_PROPORTIONAL`, se resuelve el tramo automáticamente)
- [ ] 🔨 Extender `RecordOvertimeDecisionAction` — al autorizar, resolver el tramo LFT aplicable (según minutos extra acumulados en la semana) o usar la tarifa pactada, calcular el monto, y guardarlo en el registro de la decisión (nuevas columnas en `Attendance`: `overtime_valuation_method`, `overtime_rate_applied`, `overtime_amount`)
- [ ] 🧪 Unit tests: resolución de tramo LFT dado un acumulado de horas; Feature tests: autorizar con LFT, autorizar con tarifa pactada, rechazar (sin método), tramos sin tope

## ✅ Frontend Tasks

- [ ] 📝 Tipos: `OvertimeLftTier`, `AuthorizeOvertimePayload` (extendido con `valuation_method`/`agreed_rate`) en `src/types/attendance-payroll.ts`
- [ ] 🔧 `listLftTiers()` / `updateLftTiers()` en un service (mirror de `punctuality-config-api.ts`)
- [ ] 📱 **Diálogo de autorización de hora extra** (pantalla de asistencia individual) — si se elige "sí pagar", muestra un segundo paso: selector LFT (con el factor sugerido según tramo resuelto) / Tarifa pactada (campo de captura), mismo patrón visual que el diálogo de "día extra express"
- [ ] 📱 **Configuración de tramos LFT** — pantalla de administración de tramos globales (mirror de la config de rangos de puntualidad)
- [ ] 🔧 `useOvertimeLftTiers()` / `useUpdateLftTiers()` hooks

---

## 🎯 Acceptance Criteria

- [ ] Al autorizar el pago de una hora extra, el Admin puede elegir LFT (factor resuelto automáticamente por tramo) o tarifa pactada
- [ ] Los tramos LFT son configurables a nivel sistema (no por empleado) y soportan un tramo final sin tope de horas
- [ ] El monto calculado queda registrado junto con la decisión, no en una configuración aparte
- [ ] Rechazar la hora extra (como hoy, mayoría de los casos por retraso del empleado) sigue funcionando igual, sin pedir método de valoración

---

## 🔗 References

- Reemplaza el alcance de #069 (`OvertimePayConfig` por empleado, descartado — ver comentario de cierre en #069)
- Reutiliza patrones existentes: `PunctualityRange` (tramos), `NegotiatedExtraDay` (captura por instancia), `OvertimeDecisionController`/`RecordOvertimeDecisionAction` (punto de extensión)
- Issue de seguimiento: #229 (aplicar el mismo diálogo de dos pasos al flujo de cierre de día)

---

## ⏱️ Estimates

- **Optimistic:** `3h` · **Pessimistic:** `6h`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `4h43m`

### 📅 Sessions
```json
[
  { "date": "2026-07-04", "start": "23:23", "end": "01:20" },
  { "date": "2026-07-05", "start": "16:30", "end": "19:16" }
]
```
