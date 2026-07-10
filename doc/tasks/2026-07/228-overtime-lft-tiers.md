# ⚙️ Task #228: Overtime Valuation — Global LFT Tiers + Decision-Time Method Selection

## 📖 Story

**English:**
As an Admin, when I authorize payment for overtime worked outside the schedule, I want to choose whether it's valued per LFT (using a system-wide tier table of factor/hour-threshold that survives future law changes) or a rate negotiated for that specific case, so the payment reflects the real agreement instead of a pre-set default that may not apply.

**Español:**
Como Admin, al autorizar el pago de horas extra fuera de horario, quiero elegir si se valora según LFT (usando una tabla de tramos factor/tope-de-horas configurable a nivel sistema, que resista cambios futuros a la ley) o con una tarifa pactada para ese caso puntual, para que el pago refleje el acuerdo real en vez de un default preconfigurado que puede no aplicar.

---

## ✅ Backend Tasks

- [x] 📂 Migration `create_overtime_lft_tiers_table` — `factor` (decimal), `up_to_hours` (decimal nullable, null = sin tope/de ahí en adelante), `sort_order`, timestamps (mismo patrón que `PunctualityRange`)
- [x] 🔧 `OvertimeLftTier` model — método `matches(hours)`, resolución del tramo aplicable dado el acumulado semanal
- [x] 🌐 `GET /api/v1/overtime/lft-tiers` — lista de tramos vigentes
- [x] 🌐 `PUT /api/v1/overtime/lft-tiers` — reemplazo completo (mismo patrón que `UpdatePunctualityRangesController`)
- [x] 🔨 Extender `OvertimeDecisionRequest` — cuando `authorize=true`, exigir `valuation_method` (`LFT_PROPORTIONAL`|`AGREED_RATE`) y, según el método, `agreed_rate` (si `AGREED_RATE`) o nada (si `LFT_PROPORTIONAL`, se resuelve el tramo automáticamente)
- [x] 🔨 Extender `RecordOvertimeDecisionAction` — al autorizar, resolver el tramo LFT aplicable (según minutos extra acumulados en la semana) o usar la tarifa pactada, calcular el monto, y guardarlo en el registro de la decisión (nuevas columnas en `Attendance`: `overtime_valuation_method`, `overtime_rate_applied`, `overtime_amount`)
- [x] 🧪 Unit tests: resolución de tramo LFT dado un acumulado de horas; Feature tests: autorizar con LFT, autorizar con tarifa pactada, rechazar (sin método), tramos sin tope
- [x] 🌱 `OvertimeLftTierSeeder` con los tramos default (2.00x hasta 9h, 3.00x sin tope) registrado en Production/Development/Testing
- [x] 🔨 `ResolveOvertimeValuationAction` reparte proporcionalmente los minutos entre tramos cuando una misma decisión cruza el tope semanal de 9h (antes toda la decisión caía en un solo tramo)
- [x] 🔒 `RecordOvertimeDecisionAction` serializa decisiones concurrentes del mismo empleado (lock de fila) para que dos autorizaciones simultáneas no lean el mismo acumulado semanal obsoleto

## ✅ Frontend Tasks

- [x] 📝 Tipos: `OvertimeLftTier`, `AuthorizeOvertimePayload` (extendido con `valuation_method`/`agreed_rate`) en `src/types/attendance-payroll.ts`
- [x] 🔧 `listLftTiers()` / `updateLftTiers()` en un service (mirror de `punctuality-config-api.ts`)
- [x] 📱 **Diálogo de autorización de hora extra** (pantalla de asistencia individual) — si se elige "sí pagar", muestra un segundo paso: selector LFT (con el factor sugerido según tramo resuelto) / Tarifa pactada (campo de captura), mismo patrón visual que el diálogo de "día extra express"
- [x] 📱 **Configuración de tramos LFT** — pantalla de administración de tramos globales (mirror de la config de rangos de puntualidad), consolidada como tab en `/configuracion` (oculto según permiso) en vez de ruta standalone sin navegación
- [x] 🔧 `useOvertimeLftTiers()` / `useUpdateLftTiers()` hooks
- [x] 🔒 `OvertimeDecisionPayload` como discriminated union — `valuation_method` requerido en tipo cuando `authorize=true`

---

## 🎯 Acceptance Criteria

- [x] Al autorizar el pago de una hora extra, el Admin puede elegir LFT (factor resuelto automáticamente por tramo) o tarifa pactada
- [x] Los tramos LFT son configurables a nivel sistema (no por empleado) y soportan un tramo final sin tope de horas
- [x] El monto calculado queda registrado junto con la decisión, no en una configuración aparte
- [x] Rechazar la hora extra (como hoy, mayoría de los casos por retraso del empleado) sigue funcionando igual, sin pedir método de valoración

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
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `7h51m`

### 📅 Sessions
```json
[
  { "date": "2026-07-04", "start": "23:23", "end": "01:20" },
  { "date": "2026-07-05", "start": "16:30", "end": "19:16" },
  { "date": "2026-07-08", "start": "20:00", "end": "21:10" },
  { "date": "2026-07-09", "start": "17:40", "end": "19:38" }
]
```

## 📊 Retrospective
- **Actual total:** 7h 51m (117m + 166m + 70m + 118m)
- **vs optimistic:** +4h 51m
- **vs pessimistic:** +1h 51m

**Justification:**

The original scope (LFT tiers CRUD, decision-time valuation method selection, config screen, dialog two-step flow) landed within the first two sessions at 4h43m — comfortably under the 6h pessimistic estimate. All the overrun came from work discovered only *after* the feature was reviewed and used in practice, none of which was in the original estimate:

1. **Missing navigation** — the LFT tiers config screen shipped as a standalone route with no link anywhere in the UI; manual testing surfaced it, and the fix was consolidated into the `/configuracion` tabs (also removing the now-redundant standalone routes and hiding each tab by permission).
2. **No default configuration** — the feature shipped with an empty tiers table, so `LFT_PROPORTIONAL` always 422'd until an admin manually configured tiers. Added `OvertimeLftTierSeeder` with the LFT-mandated defaults (2x/3x) across Production, Development and Testing.
3. **Legal-compliance bug** — a domain question about whether the calculation matched Art. 66-68 LFT surfaced that a single day's overtime straddling the 9h/weekly cap was priced entirely under one tier instead of being split. This required reworking `ResolveOvertimeValuationAction`'s core algorithm plus new Feature/Unit tests.
4. **Standard PR review cycle** — Copilot's 7 review comments included a real type-safety gap (the overtime-decision payload allowed `authorize:true` without a `valuation_method` at compile time), fixed via a discriminated union that cascaded through the API client, hook, and page-level callbacks — and caught a genuine bug of its own (`attendance_id` leaking into the request body) along the way.
5. **Concurrency race condition** — a follow-up review flagged that two managers deciding different attendances of the same employee at the same moment could both read stale weekly-accumulated hours. Fixed with a transaction + row lock, which then required a Cognitive Complexity refactor to keep SonarCloud green.
6. **SonarCloud cleanup** — two iterations to bring new code smells to zero on both `api` and `webapp` (one of which was introduced by the concurrency fix itself).

None of items 1-6 were foreseeable at estimation time — they're the kind of gaps that only show up once a feature is actually clicked through, reviewed by a second pair of eyes, and reasoned about against the letter of the law it's meant to implement.
