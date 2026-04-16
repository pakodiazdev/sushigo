# Application Clock Architecture (ES)

## Alcance

Definir una unica fuente de verdad para el tiempo de negocio de la aplicacion, compartida por backend y frontend.
El objetivo es eliminar dependencia directa de `Date` (cliente) y `now()/Carbon::now()` (servidor) en reglas de negocio sensibles al tiempo.

---

## 1) Problema actual

Hoy la aplicacion mezcla 3 relojes:

- Reloj del cliente (`Date`, `Date.now()`) para defaults, validaciones y contexto de UI.
- Reloj del servidor (`now()`, `Carbon::now()`) para reglas y persistencia.
- Reloj de pruebas (`X-Test-Time` + `SetTestTimeMiddleware`) para E2E/testing.

Esto introduce diferencias entre frontend y backend, dificulta reproducir bugs y hace fragil el testing manual de flujos dependientes de hora.

---

## 2) Objetivos

- Una sola hora de negocio observable por todo el sistema (`application now`).
- Poder simular tiempo en ambientes no productivos sin cambiar reloj del OS.
- Mantener timestamps tecnicos (`created_at`, `updated_at`) en tiempo real del sistema.
- Forzar convenciones para que nueva logica de negocio no use reloj local directo.

No objetivo:

- Reemplazar visualizacion de fechas historicas provenientes de DB/API.
- Cambiar semantica de columnas `time` (horarios esperados) que representan hora de reloj local.

---

## 3) Definiciones

- `instant_utc`: instante absoluto en UTC (`2026-04-16T19:25:00Z`).
- `business_timezone`: zona de negocio (ej. `America/Mexico_City`).
- `application_now_utc`: instante actual entregado por `ApplicationClock`.
- `business_date`: fecha local derivada de `application_now_utc` en `business_timezone`.
- `technical_timestamp`: timestamp de infraestructura/auditoria (tiempo real del sistema).

---

## 4) Principios de arquitectura

1. Backend define la hora de verdad.
2. Frontend consume la hora de backend y no inventa tiempo de negocio local.
3. Toda comparacion de negocio usa `application_now_utc`.
4. Persistencia de instantes de negocio en UTC.
5. Simulacion de reloj bloqueada en produccion.

---

## 5) Modelo del reloj

Estados:

- `system`: `application_now_utc = system_now_utc`
- `simulated`: `application_now_utc = base_datetime_utc + (system_now_utc - started_real_datetime_utc)`

Tabla propuesta: `application_clock_state`

- `id` (PK)
- `mode` enum: `system | simulated`
- `base_datetime_utc` datetime nullable
- `started_real_datetime_utc` datetime nullable
- `timezone` varchar (default `app.business_timezone`)
- `updated_by` FK nullable
- `updated_at` timestamp

Invariantes:

- Solo una fila activa.
- `base_datetime_utc` y `started_real_datetime_utc` obligatorios en `simulated`.
- En `system`, ambos campos en null.

---

## 6) Servicio backend

Crear abstraccion central:

- `App\Support\Clock\ApplicationClock` (interface)
- `App\Support\Clock\DatabaseApplicationClock` (impl)

API minima recomendada:

- `nowUtc(): CarbonImmutable`
- `todayInBusinessTz(): string` (`Y-m-d`)
- `nowInBusinessTz(): CarbonImmutable`
- `mode(): ClockMode`

Regla:

- Actions/Services de negocio deben inyectar `ApplicationClock`.
- Prohibir nuevos `now()`/`Carbon::now()` en reglas de negocio.
- `now()` se permite para timestamps tecnicos o infraestructura.

---

## 7) Contrato HTTP (devtools)

Solo `local`, `devtest`, `testing`.

- `GET /api/devtools/clock`
  - retorna `mode`, `application_now_utc`, `business_timezone`, `business_date`.
- `POST /api/devtools/clock/set`
  - body: `datetime` (ISO8601 con timezone), `mode=simulated`.
- `POST /api/devtools/clock/shift`
  - body: `minutes` (int, puede ser negativo).
- `POST /api/devtools/clock/reset`
  - cambia a `mode=system`.

Seguridad:

- Guard de entorno + feature flag explicito (`CLOCK_SIMULATION_ENABLED=true`).
- Requiere permiso administrativo en devtools.
- Endpoint inexistente o bloqueado en produccion.

---

## 8) Integracion frontend

Crear `ApplicationClockStore`/hook central que lea `GET /api/devtools/clock` y exponga:

- `nowUtcIso`
- `businessDate`
- `mode`
- `isSimulated`

Crear ademas un servicio central de timezone de frontend, por ejemplo `FrontendTimezoneService`, que resuelva la zona a usar para parse/render:

- Prioridad futura: timezone preferido por usuario (cuando exista esa configuracion).
- Prioridad actual: timezone del navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

Reglas frontend:

- No usar `new Date()` para decidir estado de negocio (hoy/atrasado/vigente).
- `new Date()` si se permite para formatear fechas ya persistidas o para rendering puro, usando siempre el timezone centralizado.
- Defaults de formularios dependientes de "ahora" deben venir del reloj de aplicacion.
- Parse/render de fecha-hora visible al usuario debe usar el timezone centralizado (no offsets hardcodeados).

---

## 9) Compatibilidad con `X-Test-Time`

Estado actual util:

- `SetTestTimeMiddleware` ya permite congelar tiempo por request en testing.

Estrategia:

- Mantener `X-Test-Time` para tests deterministas por request.
- `ApplicationClock` debe respetar `Carbon::getTestNow()` cuando exista.
- Orden de precedencia recomendado:
  1. `Carbon::getTestNow()` (tests)
  2. `application_clock_state` (simulacion manual)
  3. reloj real del sistema

---

## 10) Adopcion incremental

Fase 1: cimientos backend

- migracion `application_clock_state`
- servicio `ApplicationClock`
- endpoints devtools
- pruebas unitarias y feature de seguridad

Fase 2: consumo frontend base

- hook/store global
- badge de modo en topbar
- panel de debug para set/reset/shift

Fase 3: migracion de dominios criticos

- attendance/payroll (check-in, close-day, overtime)
- leaves y reglas de fecha "hoy"
- defaults de formularios sensibles a fecha actual

Fase 4: endurecimiento

- lint/checks para detectar `Date.now()` y `new Date()` en capas de negocio frontend
- checklist PR: "usa ApplicationClock?"
- cobertura de pruebas E2E con reloj simulado

---

## 11) Riesgos y mitigaciones

- Riesgo: mezclar timestamp tecnico y de negocio.
  - Mitigacion: convencion explicita por campo y revision en PR.

- Riesgo: simulacion habilitada por error en produccion.
  - Mitigacion: doble candado (entorno + feature flag) y tests de seguridad.

- Riesgo: timezone inconsistente en cliente.
  - Mitigacion: backend siempre entrega `application_now_utc` + `business_date` calculada.

---

## 12) Criterios de aceptacion de arquitectura

- Existe un servicio backend unico para "ahora" de negocio.
- Frontend usa reloj de backend para decisiones temporales.
- No hay nuevos usos directos de reloj local en reglas de negocio.
- Se puede simular tiempo de punta a punta en ambiente no productivo.
