# Attendance/Payroll + Application Clock (ES)

## Objetivo

Aterrizar como el modulo de asistencia/nomina debe migrar al reloj de verdad de aplicacion.

## Flujos impactados

- Registro de entrada (`check_in`).
- Inicio y retorno de comida (`lunch_start`, `lunch_end`).
- Registro de salida y overtime (`check_out`, `overtime_minutes`).
- Cierre de dia masivo (`close_day`).
- Evaluaciones dependientes de "hoy" en leaves y resumenes.

## Regla de modulo

- Toda comparacion contra "hora actual" usa `ApplicationClock`.
- Timestamps tecnicos del framework siguen usando reloj del sistema.

## Cambios sugeridos por capa

Backend:

- Inyectar `ApplicationClock` en acciones de asistencia con reglas de tiempo.
- Reemplazar `Carbon::now()`/`now()` de negocio por `ApplicationClock->nowUtc()`.
- Mantener parseo de payloads con timezone explicito y conversion a UTC.

Frontend:

- Reemplazar calculos de "ahora" y "hoy" basados en `Date` local.
- Consumir `nowUtcIso` + `businessDate` desde clock store compartido.
- Resolver timezone de parse/render desde servicio central (por defecto timezone del navegador).
- Mantener `Date` solo para render/formato de valores persistidos.

## Criterios de aceptacion del modulo

- Check-in/out individual y close-day responden igual bajo modo `system` y `simulated`.
- Decisiones de overtime no cambian por desfase entre reloj cliente/servidor.
- Pruebas E2E pueden reproducir escenarios de frontera (inicio/fin de dia) sin esperas reales.

## Referencias

- `doc/architecture/application-clock/application-clock.es.md`
- `doc/conventions/backend/application-clock.md`
- `doc/conventions/frontend/application-clock.md`
