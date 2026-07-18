# Analisis Integral del Proyecto SushiGo

**Fecha de analisis**: 2026-07-18
**Version anterior**: 2026-04-08
**Branch actual**: `main` @ 2f2fdca (post-#075/#076/#131/#214/#247 merges)

> Ver `plan/roadmap.md` (en `sushigo-dev-lab`) para el detalle vivo de waves/chains e issue-por-issue;
> esta seccion resume el mismo estado a un nivel mas alto.

---

## 1. Resumen del Proyecto

**SushiGo** es una plataforma full-stack para gestion de restaurantes que forma parte del ecosistema ComandaFlow. Sistema single-tenant, multi-branch, con arquitectura centrada en unidades operativas.

**Dominios activos:**
- **Inventarios**: Control de stock por ubicaciones, movimientos de entrada/salida, UoM con conversiones
- **Caja**: Sesiones de caja, ajustes, gastos, terminales de tarjeta
- **Asistencia y Nomina** (nuevo desde Feb 2026): Empleados, horarios, check-in/out, comidas, horas extra, cierre semanal
- **Unidades Operativas**: Sucursales fisicas y eventos temporales
- **Control de Usuarios**: OAuth, roles y permisos granulares

### Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| Backend | PHP 8.2, Laravel 12, Passport OAuth, Spatie Permissions |
| Frontend | React 19, TypeScript 5, Vite 7, TanStack Router/Query, Zustand |
| Base de Datos | PostgreSQL 15 |
| Infraestructura | Docker Compose, Nginx, Supervisor |
| Mobile (planificado) | Flutter, Dart, GoRouter, Riverpod |
| Testing | PHPUnit (442 tests), Vitest (1123 tests), Cypress (21 tests) |
| Calidad | SonarCloud, ESLint, PHP Pint, Branch Protection |

---

## 2a. Progreso Mas Reciente (2026-04-08 → 2026-07-18)

Desde el analisis de abril, el trabajo se organizo en 3 cadenas secuenciales (Payroll, Overtime,
Vacaciones) ejecutadas en paralelo a traves de los 5 workspaces del dev-lab. **Las 3 cadenas y las
5 waves planificadas estan hoy 100% completas** — ver `plan/roadmap.md` para el detalle completo.

| Cadena/Area | Issues | Estado |
|---|---|---|
| **Chain 1 — Payroll** | #072 Preview → #073 Confirm → #074 Detalle → #075 Export CSV → #076 Reopen | ✅ Completa (ultimo merge 2026-07-17) |
| **Chain 2 — Overtime** | #069 Config → #070 Bank balance → #071 Movimiento manual (+ #228 LFT tiers, #229 dialogo en day-close) | ✅ Completa (ultimo merge 2026-07-15) |
| **Chain 3 — Vacaciones** | #081 Entitlement → #082 Request/approve (+ #212 policy config, #214 policies configurables) | ✅ Completa (ultimo merge 2026-07-18) |
| **Leave management** | #096 Leave request (advance + express) | ✅ Completa (2026-07-05) |
| **Reportes** | #067 Reporte diario, #068 Resumen semanal | ✅ Completos |
| **Feriados** | #080 Holiday management | ✅ Completo |
| **Auditoria** | #084 Visor de audit log | ✅ Completo (2026-07-12) |
| **Design system** | #247 Centralizar componentes de boton (elimina duplicacion de dark-mode overrides) | ✅ Completo (2026-07-17), no planeado |
| **Infra/Chore** | #131 Centralizar passwords de seeders con overrides por env | ✅ Completo (2026-07-18), no planeado |
| **Bugfixes no planeados** | #211 (ApplicationClock en CashSessionService), #061 (Update Current Schedule), #233 (crash Swagger), #223, #225, #227 | ✅ Todos mergeados |

**Hito clave adicional:** las Policies de autorizacion ya no retornan `true` de forma generica —
ahora usan `$user->can('recurso.accion')` (ver `app/Policies/*`). El item "Autorizacion Real" que
la seccion 6 de abril marcaba como pendiente de alta prioridad **ya esta resuelto**.

---

## 2. Progreso desde el Ultimo Analisis (2026-01-27 → 2026-04-08)

### Modulo de Asistencia y Nomina — Desarrollo Principal

Se construyo el modulo completo de Asistencia desde cero, abarcando backend y frontend:

| Area | Tareas Completadas | Descripcion |
|------|-------------------|-------------|
| **Fundacion** | #014-#016 | Auth consolidado (Zustand), Employee CRUD API |
| **Periodos y Salarios** | #021-#023, #026 | Employment periods, wage history (effective-dated) |
| **Asistencia Core** | #027-#035 | Modelos, audit log, check-in, lunch-start, lunch-return, check-out, today API |
| **Horarios** | #030, #053, #056, #088 | Modelos de schedule, crear horario semanal, vista actual, overrides por dia |
| **Frontend Asistencia** | #032-#034 | Lunch-start, lunch-return, check-out con wizard de cierre de dia |
| **Infraestructura QA** | #040-#046 | Pint, ESLint, PHPUnit, Vitest, SonarCloud, branch protection |
| **Testing Strategy** | #089, #090 | Refactor testing pyramid, FileTokenRecorder, Fakes seeders |

### Hitos Clave

1. **Auth consolidado** (#014): Eliminado `AuthContext.tsx`, todo en Zustand con branches y permisos
2. **Asistencia end-to-end**: Flujo completo check-in → lunch → check-out → close-day
3. **Horarios flexibles** (#053, #088): Horario semanal + overrides temporales con alcance flexible
4. **Testing optimizado** (#089): Cypress 04:06 → 03:17 (-20%), migracion de 18 tests a Vitest
5. **Independencia de infra** (#090): FileTokenRecorder reemplaza Mailhog, Fakes namespace

### Tareas Completadas por Periodo

| Periodo | Cantidad | Notas |
|---------|----------|-------|
| Nov 2025 | 7 | Setup, auth, inventarios, caja |
| Dic 2025 | 3 | Cash adjustments, branch management |
| Ene 2026 | 2 | Production deployment, staging |
| Feb 2026 | 24 | Foundation del modulo Asistencia |
| Mar 2026 | 3 | Horarios (crear, ver, overrides) |
| Abr 2026 | 2 | Testing strategy y Fakes |
| **Total** | **41** | |

---

## 3. Tecnicas Utilizadas

### Backend (Laravel)

| Tecnica | Descripcion |
|---------|-------------|
| **Single Action Controllers (SAC)** | Cada controlador maneja una sola accion via `__invoke()` |
| **Actions Pattern** | Logica de negocio encapsulada en `app/Actions/` (15 actions) |
| **Service Layer** | Servicios para operaciones complejas (9 services) |
| **Form Request Validation** | Validacion centralizada (49 request validators) |
| **JsonResource Responses** | BaseResource con envelope `{ data, status, meta }` |
| **Trackable Seeders** | Sistema con LockedSeeder, OnceSeeder, RepeatableSeeder |
| **Effective-Dated History** | Patron effective_from/effective_to para configs (wages, schedules) |
| **HasPublicId Trait** | ULID auto-generado, route binding via `public_id` |
| **OpenAPI/Swagger** | Documentacion automatica de API |
| **Soft Deletes** | Eliminacion logica para integridad de datos |
| **Test Data Seeders** | Testing/ (deterministic), Fakes/ (volume), Development/ (full dev) |
| **FileTokenRecorder** | Alternativa a Mailhog para tests sin dependencias externas |

### Frontend (React)

| Tecnica | Descripcion |
|---------|-------------|
| **File-based Routing** | TanStack Router con auto-generacion de rutas |
| **Server State** | TanStack Query para cache y sincronizacion |
| **Client State** | Zustand con persistencia en localStorage |
| **react-hook-form + zod** | Formularios tipados con validacion declarativa |
| **Custom Hook Pattern** | `use-<component>.ts` para separacion logica/vista |
| **Composable UI** | Componentes estilo Shadcn/ui |
| **Strict TypeScript** | No `any`, `unknown` + utilities para errores |
| **API Error Utilities** | `getApiErrorMessage()`, `getApiValidationErrors()` |

---

## 4. Metricas del Codigo

### Backend (Laravel API)

| Metrica | Ene 2026 | Abr 2026 | Jul 2026 | Cambio (Abr→Jul) |
|---------|----------|----------|----------|--------|
| Controllers | 73 | 96 | 158 | +62 |
| Models | 22 | 32 | 55 | +23 |
| Services | 6 | 9 | 28 | +19 |
| Actions | 2 | 15 | 31 | +16 |
| Request Validators | 12 | 49 | 88 | +39 |
| API Resources | — | 7 | 28 | +21 |
| PHPUnit tests | ~50 | 442* | 112 | ver nota* |

\* El numero de abril (442) conto casos de prueba individuales via `php artisan test`; el de julio
cuenta **archivos** de test via `git ls-tree` (no se corrio la suite completa esta pasada) — no son
directamente comparables. Recomendado: correr `php artisan test` en un proximo analisis para tener
un numero de casos real.

### Frontend (React Webapp)

| Metrica | Ene 2026 | Abr 2026 | Jul 2026 | Cambio (Abr→Jul) |
|---------|----------|----------|----------|--------|
| Componentes (.tsx) | 38 | 112 | 293 | +181 |
| Paginas | 18 | 27 | 42 | +15 |
| Vitest tests | — | 1,123* | 237 | ver nota* |
| Cypress tests | — | 21* | 45 | ver nota* |

\* Mismo caveat que arriba: abril conto casos de prueba (`it()`/`test()` individuales), julio cuenta
**archivos** `.test.ts(x)` / `.cy.ts`. No comparar directamente sin recorrer la suite.

### Calidad y Testing

| Metrica | Valor (Abr 2026, casos) | Valor (Jul 2026, archivos) |
|---------|---|---|
| PHPUnit | 442 casos | 112 archivos de test |
| Vitest | 1,123 casos | 237 archivos de test |
| Cypress | 21 casos (6 specs) | 45 specs (`.cy.ts`) |
| SonarCloud | Activo, >= 80% coverage en codigo nuevo | Sin cambios, requisito de merge en todos los PRs recientes |
| Quality gates | Pint + ESLint + TypeScript + Branch Protection | Sin cambios |

---

## 5. Scorecard de Calidad

| Area | Ene 2026 | Abr 2026 | Tendencia |
|------|----------|----------|-----------|
| **Arquitectura API** | 90 (A) | 92 (A) | ↑ Actions pattern maduro |
| **Modelos y Relaciones** | 92 (A) | 93 (A) | ↑ 10 modelos nuevos, effective-dated |
| **Validacion de Requests** | 88 (A-) | 90 (A) | ↑ 49 validators, zod en frontend |
| **Service/Actions Layer** | 90 (A) | 92 (A) | ↑ 15 actions, patron consolidado |
| **Cobertura de Tests** | 80 (B+) | 90 (A) | ↑↑ 442+1123+21 tests |
| **Practicas Laravel** | 85 (B+) | 88 (A-) | ↑ Seeders, Resources, Pint |
| **Organizacion Frontend** | 80 (B) | 88 (A-) | ↑↑ Hooks, componentes, separacion |
| **TypeScript/Type Safety** | 75 (B-) | 88 (A-) | ↑↑ No-any enforced, zod |
| **State Management** | 80 (B) | 90 (A) | ↑ Auth consolidado, hooks pattern |
| **Manejo de Errores** | 65 (C+) | 78 (B) | ↑ API error utilities, toast pattern |

### Calificacion Global: 89/100 (A-)

**Mejora significativa desde 80/100 (B) en enero.** Las principales mejoras fueron: consolidacion de auth, testing masivo (0 → 1,586 tests), eliminacion de `any`, patron de hooks consistente, y estrategia de testing documentada.

---

## 6. Areas de Oportunidad

### Resueltas desde Enero 2026

| Area | Estado |
|------|--------|
| ~~Consolidar Estado de Autenticacion~~ | ✅ Completado (#014) — Todo en Zustand |
| ~~Uso de `any` en TypeScript~~ | ✅ Resuelto — `no-explicit-any` enforced |
| ~~Sin tests frontend~~ | ✅ Resuelto — 1,123 Vitest + 21 Cypress (abril); 237 Vitest + 45 Cypress specs (julio) |
| ~~Respuestas API inconsistentes~~ | ✅ Resuelto — JsonResource con BaseResource |
| ~~Autorizacion Real~~ | ✅ Resuelto desde abril — Policies usan `$user->can('recurso.accion')`, ya no `return true` generico |

### Pendientes

| Prioridad | Area | Detalle |
|-----------|------|---------|
| Alta | **Locking de periodos cerrados** | Nuevo hallazgo (#251, abierto 2026-07-15): el close/reopen de payroll (#073-#076) existe, pero attendance/payroll-input de fechas dentro de un periodo `CLOSED` aun se puede editar sin bloqueo |
| Alta | **Excepciones de Dominio** | Aun se usa `Exception` generica en algunos servicios (no re-verificado esta pasada) |
| Media | **Error Boundaries** | No hay manejo global de errores en React (no re-verificado esta pasada) |
| Media | **Console Logs** | Reducidos pero algunos persisten en produccion (no re-verificado esta pasada) |
| Baja | **Componentes Grandes** | ProductWizard sigue en 900+ lineas (no re-verificado esta pasada) |

---

## 7. Estado del Backlog

### Trabajo en Progreso

Ninguno — los 5 workspaces del dev-lab acaban de cerrar sus PRs (#075, #076, #131, #214, #247, todas
mergeadas entre 2026-07-17 y 2026-07-18). Los 5 estan libres para tomar la siguiente tarea.

### Backlog Real Pendiente (verificado contra GitHub Issues abiertos, 2026-07-18)

Todo lo que en la version de abril aparecia como "Grupo 1-6" (32 tareas: #054-058, #061-086) **ya esta
completo** salvo las 2 excepciones explicitamente diferidas. El backlog real hoy es mucho mas chico:

#### Nuevas (sin empezar, sin conflicto entre si — candidatas a Wave 6)

| # | Tarea | Area | Est. | Dependencia |
|---|-------|------|------|-------------|
| 251 | Bloquear edicion de attendance/payroll-input en periodos `CLOSED` | Backend, attendance-payroll | ~3-4h | #074/#076 ✅ (ya mergeados) |
| 249 | Checkbox "aplicar al resto" en el dialogo de decision masiva de overtime | Frontend | ~2h | #228/#229 ✅ (ya mergeados) |
| 248 | Centralizar componente `Label` de formularios (contraste en `<dialog>`) | Frontend, design system | ~2h | Independiente, mismo patron que #247 ✅ |

#### Diferidas a proposito (sin cambios desde abril)

| # | Tarea | Motivo |
|---|-------|--------|
| 085 | Bootstrap app movil (Flutter) | Bloqueado — requiere repo Flutter separado |
| 086 | Unificar `Employee.name` con `User.name` | Breaking change, requiere periodo de deprecacion coordinado |

#### Requieren solo triage/verificacion, no codigo nuevo

| # | Tarea | Accion sugerida |
|---|-------|------------------|
| 153 | Quitar `--ignore-platform-req=php` | Bloqueado en upstream (soporte PHP 8.5), revisar periodicamente |
| 168 | `cy.loginByApi` apunta a devtest API en dev-lab | Bug especifico de dev-lab |
| 170 | Target `cypress-devlab` para E2E interactivo | Mejora especifica de dev-lab |

#### Cerrados 2026-07-18 (bookkeeping obsoleto, trabajo ya entregado)

| # | Tarea | Resuelto por |
|---|-------|--------------|
| 216 | Remove explicit `any` / react-refresh warnings | PR #217 (mergeado 2026-07-03) — cerrado con comentario referenciando el PR |
| 055 | Mark Day Status (redesign) | PR #103 (mergeado 2026-04-13) — checklist del issue nunca se actualizo tras el merge; follow-ups #096/#104/[#098]/#57/#58 tambien ya cerrados — cerrado con comentario referenciando el PR |

> Nota de higiene: `doc/tasks/backlog/066-punctuality-exceptions.md`, `069-overtime-config.md` y
> `121-indefinite-exception-summary.md` corresponden a issues cerrados hace semanas pero nunca se
> movieron a `doc/tasks/2026-0X/` segun la convencion. Limpieza pendiente, no bloqueante.

---

## 8. Recomendacion: Siguiente Tarea

**Todo el plan activo previo (Chains 1-3, Waves 1-5) esta completo.** La decision ya no es "que sigue
en la cadena" sino "como repartir las 3 tareas nuevas e independientes entre los 5 workspaces libres".

### Opcion recomendada (trabajo en paralelo — Wave 6): **#251 + #249 + #248 simultaneas**

Ninguna depende de las otras ni toca los mismos archivos (backend `AttendancePolicy`/`PayPeriod` vs.
dialogo frontend de overtime vs. componente `Label` global) — mismo perfil de bajo riesgo que la Wave 3.

| Prioridad de arranque | Issue | Por que |
|---|---|---|
| 1 | **#251** | Unico con riesgo real de producto: hoy se puede editar en silencio un dia dentro de un periodo de nomina ya cerrado, aunque #073-#076 (close/reopen) ya existan |
| 2 | **#249** | Pequena, misma familia (overtime), mantiene momentum en attendance-payroll |
| 3 | **#248** | Limpieza pura de design system, cero urgencia, buen filler |

### Si prefieres trabajar solo en lugar de en paralelo

Secuencia sugerida: **#251 → #249 → #248**, en ese orden de prioridad de negocio.

### Quick wins administrativos

~~Cerrar #216 y #055 en GitHub~~ — ✅ hecho el 2026-07-18, ambos cerrados con comentario referenciando
el PR que los resolvio (#217 y #103 respectivamente).

---

## 9. Cumplimiento de Requerimientos

### Nuevos Requerimientos Cumplidos (desde Abr 2026)

| Requerimiento | Estado | Evidencia |
|---------------|--------|-----------|
| Overtime management (config + banco + movimientos) | ✅ | #069, #070, #071, #228 |
| Day status marking | ✅ | #054/#055 ya resueltos en el codigo (`MarkDayStatusAction`, `DayStatus` enum) |
| Close-day wizard | ✅ | #034 finalizado |
| Payroll close (preview, confirm, detail, export, reopen) | ✅ | #072-#076, cadena completa |
| Leave/vacation management | ✅ | #081, #082, #096, #212, #214 |
| Operational reports | ✅ | #067, #068 |
| Punctuality configuration | ✅ | #063-#066 |
| Autorizacion por dominio | ✅ | Policies usan `$user->can()`, ya no `return true` |
| Audit log viewer | ✅ | #084 |

### Requerimientos Parciales

| Requerimiento | Estado | Brecha |
|---------------|--------|--------|
| Proteccion de periodos cerrados | ⚠️ | Close/reopen existe pero no bloquea ediciones directas — #251 |
| Dialogo masivo de overtime | ⚠️ | Falta checkbox "aplicar al resto" — #249 |
| Consistencia visual de formularios | ⚠️ | `Label` component no centralizado (mismo patron que #247 ya resuelto para `Button`) — #248 |

### No Implementados (diferidos a proposito)

| Requerimiento | Tarea Backlog |
|---------------|---------------|
| Mobile app | #085 |
| Unificacion Employee/User.name | #086 |

---

*Documento actualizado el 2026-07-18 por Claude Code*
