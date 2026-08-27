# Analisis Integral del Proyecto SushiGo

**Fecha de analisis**: 2026-08-11
**Version anterior**: 2026-07-18
**Branch actual**: `main` @ ffb1603 (post-#380 merge, cierre de Sprint 002 — ver `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md`)

> `plan/roadmap.md` (en `sushigo-dev-lab`) ya no existe — el proceso de waves/chains ad hoc que
> documentaba se reemplazo por el proceso formal de sprints (`doc/sprints/`, adoptado en #330/#359,
> ver §2b). Ver `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` para el detalle
> vivo issue-por-issue del sprint actual; esta seccion resume el mismo estado a un nivel mas alto.

---

## 1. Resumen del Proyecto

**SushiGo** es una plataforma full-stack para gestion de restaurantes que forma parte del ecosistema ComandaFlow. Sistema single-tenant, multi-branch, con arquitectura centrada en unidades operativas.

**Dominios activos:**
- **Inventarios**: Control de stock por ubicaciones, movimientos de entrada/salida, UoM con conversiones
- **Caja**: Sesiones de caja, ajustes, gastos, terminales de tarjeta
- **Asistencia y Nomina** (nuevo desde Feb 2026): Empleados, horarios, check-in/out, comidas, horas extra, cierre semanal
- **Menu / Platillos** (nuevo desde Ago 2026, Sprint 002): Categorias de menu, platillos con precio base, extras de personalizacion por platillo — catalogo `/productos` que reemplazo el stub estatico
- **Unidades Operativas**: Sucursales fisicas y eventos temporales
- **Control de Usuarios**: OAuth, roles y permisos granulares
- **Sistema de Media** (nuevo desde Ago 2026): Upload/reorder/delete generico, cloud-swappable (storage local hoy), con capa de autorizacion por ownership — usado hoy por Items y Dishes, disenado para extenderse a avatares de Employee/User

### Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| Backend | PHP 8.5, Laravel 12, Passport OAuth, Spatie Permissions |
| Frontend | React 19, TypeScript 5, Vite 7, TanStack Router/Query, Zustand |
| Base de Datos | PostgreSQL 15 |
| Infraestructura | Docker Compose, Nginx, Supervisor |
| Mobile (planificado) | Flutter, Dart, GoRouter, Riverpod |
| Testing | PHPUnit (150 archivos), Vitest (259 archivos), Cypress (54 specs) — ver §4 para metodologia |
| Calidad | SonarCloud, ESLint, PHP Pint, Branch Protection |

---

## 2a. Progreso Mas Reciente (2026-04-08 → 2026-07-18)

Desde el analisis de abril, el trabajo se organizo en 3 cadenas secuenciales (Payroll, Overtime,
Vacaciones) ejecutadas en paralelo a traves de los 5 workspaces del dev-lab. **Las 3 cadenas y las
5 waves planificadas estan hoy 100% completas** — en su momento (julio) el detalle vivia en
`plan/roadmap.md`; esa referencia es historica y ya no es valida — ver la nota del encabezado y §2b.

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

## 2b. Progreso Mas Reciente (2026-07-18 → 2026-08-11)

Las 3 tareas de "Wave 6" que el analisis de julio recomendaba (#251, #249, #248) **se completaron
las tres entre el 2026-07-19 y el 2026-07-20**, un dia despues de aquel analisis. Desde ahi el
trabajo se organizo en dos grandes bloques: primero una ola de saneamiento tecnico (SonarCloud +
autorizacion de CashAdjustments + UX de Attendance), luego el **Sprint 002 completo**
("Platillos Catalog & Platform Hardening") ya formalmente documentado bajo el nuevo proceso de
sprints (`doc/sprints/`, adoptado en #330/#359 durante este mismo periodo). ~55 Issues cerrados en
esta ventana.

### Bloque 1 — Saneamiento tecnico (2026-07-19 → 2026-07-31, pre-Sprint 002)

| Area | Issues | Resultado |
|---|---|---|
| **Wave 6 (recomendada en jul)** | #251 Lock periodos cerrados, #249 checkbox masivo overtime, #248 centralizar `Label` | ✅ Las 3 completas |
| **SonarCloud — Security Hotspots** | #267 | ✅ Revisados y limpiados en `sushigo-api` |
| **SonarCloud — Maintainability (127 issues abiertos)** | #268, #305–#323 (18 reglas `typescript:S*` distintas: cognitive complexity, PRNGs inseguros, `any` props, claves de array como key, jump statements redundantes, etc.) | ✅ Los 127 issues abiertos resueltos, uno por uno |
| **SonarCloud — Duplicacion de codigo** | #282 (883 lineas / 42 bloques), #289 (0.3% residual) | ✅ Duplicacion eliminada en `sushigo-api` |
| **CashAdjustments — Hardening de autorizacion** | #291 (Show/Update/Delete/Post sin autorizacion a nivel de recurso), #293 (ULID `public_id` en vez de id numerico), #295 (List sin autorizacion/branch-scoping), #303 (permisos faltantes en seeders) | ✅ Las 4, mismo patron que luego se replico en #377 (media) y quedo pendiente para Inventory en #399 |
| **Design system — Unificacion** | #259 (labels), #272 (migrar `<button>` a componente `Button`), #324 (catalogo dev de componentes), #342 (unificar transiciones de dialogo) | ✅ Completo |
| **Attendance UX** | #325 (overlay de dialogo no cubria pantalla completa), #326/#328 (editar eventos de asistencia ya registrados), #327/#337 (stat cards "Ausentes"/"En comida") | ✅ Completo |
| **Infra/Proceso** | #264 (nest de datos personales bajo `user` en Employee API), #296 (fix `phpunit.xml` hardcodeaba `DB_DATABASE`, rompia aislamiento por workspace), #275 (permisos granulares de UoM), #340 (versionar `.claude/settings.json`), #351/#355 (mejoras a `/finish-pr`), #368 (catch silencioso en `auth.store.ts`) | ✅ Completo |
| **Proceso de sprints** | #330 (adoptar documentacion formal de sprints, convertir plan de Sprint 1), #359 (TD-01: unificar tracking de issues/tasks — el GitHub Issue pasa a ser la unica fuente de verdad mientras esta abierto), #374 (cerrar formalmente Sprint 001), #386 (promover Sprint 002 a actual) | ✅ Completo — ver `doc/decisions/td-01-single-source-issue-tracking.md` |
| **Tooling** | #388 (`/issue`: pipeline autonomo end-to-end — `/start-issue` + `/pr-comments` + `/finish-pr`), #404 (`/issue` sin interrupciones — remueve los 5 `AskUserQuestion`) | ✅ Completo, ambos oportunistas (fuera de scope formal) |

### Bloque 2 — Sprint 002: Platillos Catalog & Platform Hardening (2026-07-31 → 2026-08-11)

**14/14 Issues completados (100%)** — documentacion completa en
[`doc/sprints/sprint-002-platillos-catalog-platform-hardening.md`](doc/sprints/sprint-002-platillos-catalog-platform-hardening.md).
Resumen ejecutivo:

| Valor | Issues | Resultado |
|---|---|---|
| **Critico — Seguridad** | #384 | `APP_KEY` hardcodeado (compartido prod/preview, expuesto en historial de un repo publico) removido de `docker-compose.*.yml`; rotacion de la key viva en Cloud Run queda pendiente (requiere acceso a GCP fuera del alcance de la automatizacion) |
| **Alto — Platillos (5 issues, cadena completa)** | #377 (sistema generico de media upload), #378 (componente `<MediaGalleryUploader />` reutilizable), #379 (dominio backend: categorias/platillos/extras), #381 (seed data en 3 niveles), #380 (UI del catalogo `/productos`) | El stub estatico "Pagina en construccion" del menu real (sushigo-romita.com/menu) se reemplazo por un catalogo funcional con fotos, filtros, extras configurables y gestor de categorias |
| **Alto — Correctness** | #358 | Empleados en vacaciones/dia de descanso programado ya aparecen bajo "Ausentes" desde el inicio del dia |
| **Medio — Deuda tecnica** | #360 (migrar `now()`/`new Date()` a `ApplicationClock`), #383/#382 (migrar tablas de Payroll Periods y reporte diario al `DataGrid<T>` compartido), #365 (convencion: pruebas locales pre-PR solo linters + tests entregados, suite completa es trabajo de CI) | Completo |
| **Medio — UX** | #357 → **reemplazado por #410** | Ver nota abajo |
| **Bajo — Limpieza** | #385 (4 props `Readonly<...>`), #376 (quitar selector Insumo/Activo de items) | Completo |

**Nota sobre #357/#410:** el PR original de #357 (animacion de salida de tarjetas en Attendance
Today) acumulo 26+ rondas de fixes de revision, casi todas por la misma causa raiz — el codigo
adivinaba el resultado de una accion y esperaba un poll para confirmarlo, en vez de leer la
respuesta ya confirmada que el backend devuelve en cada mutacion. Ese analisis se convirtio en un
Issue nuevo, `#410`, que reconstruyo la funcionalidad sobre esa base corregida y la entrego (PR
#411) — `#357` quedo `⚠️ Deprecated` en el documento del sprint, no `✅`, pero su valor si se
entrego.

**Hallazgo colateral durante Sprint 002:** al construir el patron de media upload para Item (#377)
y replicarlo a Dish (#380), quedo en evidencia que `Item`/`ItemVariant` y el resto de Inventory
nunca recibieron el mismo endurecimiento de autorizacion/ULID que CashAdjustments ya tiene desde
julio (#291/#293) — de ahi nacieron los pendientes `#399` y, mas grave, se **descubrio que
`ItemPolicy` retorna `true` sin condicion en todos sus metodos** (`#400`, ver §6). Esto significa
que la mejora "Autorizacion Real" que el analisis de julio daba por completamente resuelta
**tenia un hueco real en el dominio de Inventory** que no se habia detectado hasta ahora.

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
| **Actions Pattern** | Logica de negocio encapsulada en `app/Actions/` (34 actions) |
| **Service Layer** | Servicios para operaciones complejas (33 services) |
| **Form Request Validation** | Validacion centralizada (110 request validators) |
| **JsonResource Responses** | BaseResource con envelope `{ data, status, meta }` |
| **Trackable Seeders** | Sistema con LockedSeeder, OnceSeeder, RepeatableSeeder |
| **Effective-Dated History** | Patron effective_from/effective_to para configs (wages, schedules) |
| **HasPublicId Trait** | ULID auto-generado, route binding via `public_id` — cubre HR/Attendance/Payroll, CashAdjustments (#291/#293) y Media (`#377`); Inventory (Item/ItemVariant/Stock) queda pendiente (`#399`) |
| **ApplicationClock (inyectado)** | Reloj simulable inyectado en Actions/Services/Controllers en vez de `now()`/`new Date()` directo — permite congelar/adelantar el tiempo en dev y tests (`#360`, `doc/conventions/backend/application-clock.md`) |
| **Media System (storage-backed)** | Sistema generico de upload/reorder/delete de galerias, cloud-swappable, con capa de autorizacion por ownership (`AuthorizesMediaOwnership`, `owner_token` para formularios en progreso) — usado por Item y Dish, disenado para extenderse a mas entidades (`#377`) |
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
| **DataGrid\<T\> compartido** | Tabla generica con `Column<T>[]`, paginacion y skeleton loading integrados — reemplazo tablas HTML/estilos ad hoc en Payroll Periods y el reporte diario (`#382`/`#383`) |
| **MediaGalleryUploader** | Componente reutilizable de drag-drop/upload/reorder/preview + hook `useMediaGalleryUploader()`, primer consumidor de la capa de Media System del backend (`#378`) |

---

## 4. Metricas del Codigo

### Backend (Laravel API)

| Metrica | Ene 2026 | Abr 2026 | Jul 2026 | Ago 2026 | Cambio (Jul→Ago) |
|---------|----------|----------|----------|----------|--------|
| Controllers | 73 | 96 | 158 | 191 | +33 |
| Models | 22 | 32 | 55 | 60 | +5 |
| Services | 6 | 9 | 28 | 33 | +5 |
| Actions | 2 | 15 | 31 | 34 | +3 |
| Request Validators | 12 | 49 | 88 | 110 | +22 |
| API Resources | — | 7 | 28 | 32 | +4 |
| PHPUnit tests | ~50 | 442* | 112 | 150 | +38 (archivos) |

\* El numero de abril (442) conto casos de prueba individuales via `php artisan test`; julio y
agosto cuentan **archivos** de test (`find tests -name "*Test.php"`) — no se corrio la suite
completa esta pasada (ver §4 nota general). No comparar abril directamente contra jul/ago sin
recorrer la suite; jul→ago si es comparable (misma metodologia).

### Frontend (React Webapp)

| Metrica | Ene 2026 | Abr 2026 | Jul 2026 | Ago 2026 | Cambio (Jul→Ago) |
|---------|----------|----------|----------|----------|--------|
| Componentes (.tsx, incl. tests) | 38 | 112 | 293 | 314 | +21 |
| Paginas | 18 | 27 | 42 | 41 | −1 |
| Vitest tests | — | 1,123* | 237 | 259 | +22 (archivos) |
| Cypress tests | — | 21* | 45 | 54 | +9 (specs) |

\* Mismo caveat que arriba: abril conto casos de prueba (`it()`/`test()` individuales), jul/ago
cuentan **archivos** `.test.ts(x)` / `.cy.ts`. No comparar abril directamente sin recorrer la
suite; jul→ago si es comparable. La baja de 1 en Paginas esta dentro del margen de conteo (no se
identifico una ruta eliminada; probablemente diferencia de metodologia de conteo entre pasadas).

### Calidad y Testing

| Metrica | Valor (Abr 2026, casos) | Valor (Jul 2026, archivos) | Valor (Ago 2026, archivos) |
|---------|---|---|---|
| PHPUnit | 442 casos | 112 archivos de test | 150 archivos de test |
| Vitest | 1,123 casos | 237 archivos de test | 259 archivos de test |
| Cypress | 21 casos (6 specs) | 45 specs (`.cy.ts`) | 54 specs (`.cy.ts`) |
| SonarCloud | Activo, >= 80% coverage en codigo nuevo | Sin cambios, requisito de merge en todos los PRs recientes | Sin cambios; ademas la deuda de julio (127 issues + 883 lineas duplicadas + security hotspots) quedo en 0 (§2b) |
| Quality gates | Pint + ESLint + TypeScript + Branch Protection | Sin cambios | Sin cambios |

**Nota:** el badge del `README.md` raiz ("112 / 237 / 45 archivos de test") quedo desactualizado
tras esta ventana — no se corrigio en esta pasada porque el foco de este documento es el analisis
integral, no el README; queda como ajuste menor pendiente (no bloqueante).

---

## 5. Scorecard de Calidad

| Area | Ene 2026 | Abr 2026 | Ago 2026 | Tendencia |
|------|----------|----------|----------|-----------|
| **Arquitectura API** | 90 (A) | 92 (A) | 94 (A) | ↑ SAC extendido a Media/Dishes, servicios de media divididos en invokables de responsabilidad unica |
| **Modelos y Relaciones** | 92 (A) | 93 (A) | 94 (A) | ↑ Dominio Menu/Platillos + Media, cascading soft-deletes transaccionales |
| **Validacion de Requests** | 88 (A-) | 90 (A) | 91 (A) | ↑ 110 validators, patron `SharesValidationMessages` contra duplicacion |
| **Service/Actions Layer** | 90 (A) | 92 (A) | 93 (A) | ↑ 34 actions, 33 services |
| **Cobertura de Tests** | 80 (B+) | 90 (A) | 92 (A) | ↑ Cypress specs +9 (45→54), Vitest +22 archivos, gate de ≥80% en codigo nuevo sostenido en cada PR del Sprint 002 |
| **Practicas Laravel** | 85 (B+) | 88 (A-) | 90 (A) | ↑ Deuda SonarCloud de julio (127 issues + 883 lineas duplicadas + hotspots) en 0 |
| **Organizacion Frontend** | 80 (B) | 88 (A-) | 90 (A) | ↑ `DataGrid<T>` y `MediaGalleryUploader` compartidos, catalogo dev de componentes |
| **TypeScript/Type Safety** | 75 (B-) | 88 (A-) | 89 (A-) | → Estable, sin regresiones de `any` |
| **State Management** | 80 (B) | 90 (A) | 91 (A) | ↑ #410 elimino una clase entera de bugs de "adivinar y esperar poll" en Attendance Today |
| **Autorizacion / Seguridad** | — | 85 (B+)* | 82 (B) | ↓ `APP_KEY` estatico removido (#384) pero rotacion viva en Cloud Run pendiente; CashAdjustments endurecido (#291/#293) pero se **redescubrio** que `ItemPolicy` retorna `true` sin condicion (#400) — el "ya resuelto" de julio no cubria Inventory |
| **Manejo de Errores** | 65 (C+) | 78 (B) | 80 (B+) | ↑ Fix de fault-tolerance en cleanup de media concurrente; sigue sin error boundary global en React (§6) |

### Calificacion Global: 90/100 (A-)

**Se mantiene en A-, con una base mas amplia de deuda resuelta pero un hallazgo de seguridad real
que corrige una afirmacion optimista del analisis anterior.** El salto principal desde enero sigue
siendo el mismo (auth consolidado, testing masivo, eliminacion de `any`, patron de hooks), y esta
ventana suma: cero deuda de SonarCloud en `sushigo-api` (127 issues + 883 lineas duplicadas + todos
los security hotspots), el catalogo Platillos como dominio nuevo completo, y un sistema de media
generico reutilizable. La contraparte honesta: `#400` demuestra que "Autorizacion Real" (marcado
`✅ Resuelto` en julio) era cierto para HR/Attendance/CashAdjustments pero no para Inventory —
la calificacion de esa fila baja en vez de subir hasta que `#400` se cierre.

\* La fila "Autorizacion / Seguridad" no existia como fila propia del scorecard en enero/abril —
se estimo retroactivamente en 85 (B+) para abril usando el mismo hito ("Policies usan
`$user->can()`") que la seccion 2a de aquel analisis citaba como resuelto, para poder mostrar
tendencia; no es un numero recalculado desde una pasada anterior real.

---

## 6. Areas de Oportunidad

### Resueltas desde Enero 2026

| Area | Estado |
|------|--------|
| ~~Consolidar Estado de Autenticacion~~ | ✅ Completado (#014) — Todo en Zustand |
| ~~Uso de `any` en TypeScript~~ | ✅ Resuelto — `no-explicit-any` enforced |
| ~~Sin tests frontend~~ | ✅ Resuelto — 1,123 Vitest + 21 Cypress (abril); 259 Vitest + 54 Cypress specs (agosto) |
| ~~Respuestas API inconsistentes~~ | ✅ Resuelto — JsonResource con BaseResource |
| ~~Autorizacion Real (parcial)~~ | ⚠️ Resuelto para HR/Attendance/Payroll y CashAdjustments (`$user->can('recurso.accion')`) desde abril, endurecido en julio (#291/#293) — **pero no para Inventory**: `ItemPolicy` retorna `true` sin condicion en todos sus metodos, hallazgo nuevo, ver `#400` en Pendientes |
| ~~Locking de periodos cerrados~~ | ✅ Resuelto (#251, cerrado 2026-07-19) — attendance/payroll-input de fechas dentro de un periodo `CLOSED` ya no se puede editar sin bloqueo |
| ~~Deuda SonarCloud (sushigo-api)~~ | ✅ Resuelto (§2b, Bloque 1) — 127 issues de maintainability, 883 lineas duplicadas y todos los security hotspots abiertos en julio quedaron en 0 |

### Pendientes

| Prioridad | Area | Detalle |
|-----------|------|---------|
| **Alta** | **`ItemPolicy` sin autorizacion real** (`#400`) | Descubierto durante Sprint 002 al extender el patron de media/ownership a Dish — cualquier usuario autenticado puede crear/editar/eliminar/restaurar cualquier Item, sin chequear rol ni relacion con el recurso. Mismo tipo de hallazgo que "Autorizacion Real" en enero, pero en un dominio que quedo fuera del barrido de abril |
| Media | **Rotacion de `APP_KEY` viva en Cloud Run** | El `APP_KEY` hardcodeado se removio del repo y de `docker-compose.*.yml` (#384), pero las keys ya desplegadas en prod/preview no se rotaron — requiere acceso a GCP fuera del alcance de la automatizacion actual |
| Media | **`Item`/`ItemVariant`/Inventory sin `public_id` ULID** (`#399`) | El resto de la app (HR/Attendance/Payroll, CashAdjustments, Media) ya expone ULID en vez de id numerico secuencial; Inventory quedo fuera de #291/#293 y es la superficie mas grande pendiente |
| Media | **Overlap de grid en Attendance Today** (`#412`) | Las tarjetas de empleados se superponen en el rango ~1279–1490px de viewport cuando el sidebar esta expandido — bug de breakpoints Tailwind basados en viewport, no en el ancho real disponible |
| Media | **Avatar de empleado con placeholder de iniciales** (`#401`) | Deliberadamente fuera de alcance de #377 — reutilizaria el sistema de media ya construido, aplicado a `Employee`/`User` |
| Baja | **Campos monetarios como decimal, no centavos enteros** (`#415`) | Levantado durante la revision de #380 (`Dish.base_price`/`price_delta`); `technical-debt` + `priority: low`, diferido hasta un pivote multi-moneda/SaaS |
| Baja | **Excepciones de Dominio** | Aun se usa `Exception` generica en algunos servicios (no re-verificado esta pasada) |
| Media | **Error Boundaries** | No hay manejo global de errores en React (no re-verificado esta pasada) |
| Media | **Console Logs** | Reducidos pero algunos persisten en produccion (no re-verificado esta pasada) |
| Baja | **Componentes Grandes** | ProductWizard sigue en 900+ lineas (no re-verificado esta pasada) |
| Diferida | **Integracion real de WhatsApp** (`#276`) | `deferred`/`priority: low` desde el cierre de Sprint 001 — el OTP por log basta mientras no haya plan concreto de produccion |
| Diferida | **Bootstrap app movil (Flutter)** (`#85`) | `deferred`/`priority: low` — pospuesto hasta que Attendance este probado en backend+web |

---

## 7. Estado del Backlog

### Trabajo en Progreso

`#416` (resincronizacion del documento de Sprint 002 y del README) ya se mergeo — PR #417 cerrado
2026-08-12. `#418` (esta misma actualizacion de `RESUME_STATUS.md`) sigue abierto — PR #419 en
`sushigo-a`, en revision. Es el unico Issue actualmente abierto que no es backlog nuevo: es
housekeeping, se cerrara solo cuando el PR mergee.

### Backlog Real Pendiente (verificado contra GitHub Issues abiertos, 2026-08-11)

Sprint 002 completo (14/14, §2b) mas el bloque de saneamiento tecnico previo cerraron practicamente
todo lo que el analisis de julio tenia listado como pendiente o como candidato a Wave 6 — incluidas
las 3 tareas de Wave 6 (#251/#249/#248) y los 3 items de "solo triage" (#153/#168/#170), todas ya
cerradas. En total hay 8 Issues abiertos en `pakodiazdev/sushigo` a la fecha de este analisis:
`#418` (esta misma actualizacion, ya cubierta arriba en "Trabajo en Progreso", excluida del conteo
de abajo) mas los 7 que forman el backlog real, ninguno agrupado en un sprint todavia:

#### Abiertos, sin sprint asignado

| # | Tarea | Area | Prioridad | Notas |
|---|-------|------|-----------|-------|
| 400 | `ItemPolicy` retorna `true` sin condicion en todos sus metodos | Backend, seguridad | **Alta** | Hallazgo real durante Sprint 002 (§2b/§6) — cualquier usuario autenticado puede crear/editar/eliminar/restaurar cualquier Item |
| 412 | Overlap de grid en Attendance Today (~1279–1490px con sidebar expandido) | Frontend, bug | Media | Breakpoints Tailwind basados en viewport, no en ancho real disponible tras restar el sidebar |
| 399 | Exponer `public_id` (ULID) para Item/ItemVariant y el resto de Inventory | Backend, tech-debt | Media | Levantado durante la revision de #377; mismo patron ya aplicado a CashAdjustments/Media/HR |
| 401 | Avatar de empleado con placeholder de iniciales | Frontend/Backend, feature | Media | Reutiliza el sistema de media de #377; deliberadamente fuera de su alcance original |
| 415 | Campos monetarios como enteros (centavos) en vez de `decimal` | Backend, tech-debt | Baja | `priority: low`, diferido hasta pivote multi-moneda/SaaS |
| 276 | Integrar un proveedor real de WhatsApp en `WhatsAppService` | Backend | Diferida | `deferred`, decidido al cierre de Sprint 001 |
| 85 | Bootstrap app movil (Flutter) | Mobile | Diferida | `deferred`, pospuesto hasta que Attendance este probado en backend+web |

> Correccion: una version anterior de este documento listaba `#86` (Unificar `Employee.name` con
> `User.name`) aqui como "cerrado sin evidencia de PR encontrada" — busqueda incorrecta (`gh pr list
> --search "86 in:title"` no matchea `#086` con padding de ceros, que es como GitHub tokeniza el
> titulo). `#86` si se implemento: PR #263 (`🔨 [#086][a] - Unify Employee name with User.name 🔗`),
> mergeado 2026-07-21T03:52:30Z — migro `first_name`/`last_name` a `users` como fuente unica de
> verdad, elimino la logica de sincronizacion manual en `UpdateEmployeeController`, mantuvo el
> contrato de API identico (verificado con 0 cambios de frontend necesarios). Se retira de esta
> tabla; ver §9 para el requerimiento correspondiente.

> Nota de higiene (sigue pendiente desde julio): `doc/tasks/backlog/066-punctuality-exceptions.md`,
> `069-overtime-config.md` y `121-indefinite-exception-summary.md` corresponden a issues cerrados
> hace meses pero nunca se movieron a `doc/tasks/2026-0X/` segun la convencion — ahora ademas
> desactualizado, ya que el propio `doc/tasks/backlog/` quedo retirado por TD-01 (#359, §2b): los
> issues ya no pasan por un archivo local antes de abrirse en GitHub. Limpieza pendiente, no
> bloqueante.

---

## 8. Recomendacion: Siguiente Tarea

**Sprint 002 esta 100% entregado (§2b), pero formalmente no cerrado** — `doc/conventions/sprints.md`
§4 exige promover un Sprint 003 para eso, y todavia no hay ninguno planeado en `doc/sprints/planned/`
(ver el propio `doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17/§18). La decision
real no es "que sigue en la cadena" sino dos cosas en paralelo: (a) cerrar `#418`/PR #419 (este mismo
refresh), y (b) decidir si los 7 Issues abiertos del backlog real (§7) justifican ya un Sprint 003,
o si conviene resolverlos como backlog suelto primero y planear el sprint despues.

### Opcion recomendada: **`#400` primero, en solitario — es el unico con riesgo real de producto**

`#400` no es deuda tecnica cosmetica: es una brecha de autorizacion viva en produccion (cualquier
usuario autenticado puede modificar o borrar cualquier Item del catalogo de inventario). Mismo perfil
de riesgo que tuvo `#251` en julio ("unico con riesgo real de producto") — se recomienda resolverlo
antes de agrupar el resto en un sprint, no despues.

| Prioridad de arranque | Issue | Por que |
|---|---|---|
| 1 | **#400** | Brecha de autorizacion real y explotable hoy — sin dependencias, cambio acotado a `ItemPolicy` |
| 2 | **#412** | Bug de UX visible para el usuario final, fix acotado (breakpoints), sin dependencias |
| 3 | **#399** | Deuda de seguridad menor (ids enumerables) pero superficie mas grande (7 modelos + rutas + frontend) — buen candidato a Sprint 003 en vez de un fix suelto |
| 4 | **#401** | Feature nueva, no urgente, depende conceptualmente de #377 (ya mergeado, sin bloqueo real) |
| 5 | **#415** | Ya diferido explicitamente hasta un pivote multi-moneda/SaaS — no tomar todavia |

### Si se decide agrupar en Sprint 003 en lugar de resolver #400 suelto

`#400`, `#412`, `#399`, `#401` no comparten archivos entre si (Policy backend vs. CSS de grid vs.
migraciones de Inventory vs. media de Employee) — mismo perfil de bajo riesgo para paralelizar entre
workspaces que tuvo Round 1 de Sprint 002. Aun asi, dado que `#400` es una brecha de seguridad activa,
no esperar a planear el sprint completo para resolverlo — sacarlo primero, como Sprint 001 hizo con
`#384` en Sprint 002.

### Quick wins administrativos

- ~~Mergear PR #417 (`#416`)~~ — ✅ hecho, `#416` cerrado 2026-08-12 via PR #417
- Mergear PR #419 (`#418`, este mismo refresh de `RESUME_STATUS.md`)
- Cuando se retome el trabajo: archivar `#357`/`#410` en `doc/tasks/2026-08/` y sincronizar el
  `Tracked` real de `#360` sobre su Issue vivo — ambos gaps quedaron documentados en el Follow-up
  Work del sprint (`doc/sprints/sprint-002-platillos-catalog-platform-hardening.md` §17) pero sin
  Issue propio todavia

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
| Audit log viewer | ✅ | #084 |
| Proteccion de periodos cerrados | ✅ | #251 — attendance/payroll-input de un periodo `CLOSED` ya no se puede editar sin bloqueo |
| Dialogo masivo de overtime | ✅ | #249 — checkbox "aplicar al resto" agregado |
| Consistencia visual de formularios (`Label`) | ✅ | #248/#259 |
| SonarCloud sin deuda abierta (`sushigo-api`) | ✅ | #267/#268/#282/#289 (§2b) |
| Catalogo de menu / Platillos | ✅ | #377-#381 — reemplaza el stub estatico `/productos`, cadena completa (§2b) |
| Correccion de "Ausentes" en Attendance Today | ✅ | #358 — empleados en vacaciones/descanso ya aparecen desde el inicio del dia |
| Migracion a `ApplicationClock` inyectado | ✅ | #360 |
| Tablas unificadas con `DataGrid<T>` (Payroll Periods, reporte diario) | ✅ | #382, #383 |
| Animacion de salida de tarjetas en Attendance Today | ✅ | #410 (reemplazo de #357, ver §2b) |
| `APP_KEY` estatico removido de git/compose | ✅ | #384 (rotacion de la key **viva** en Cloud Run sigue pendiente, ver Parciales) |
| Unificar `Employee.name` con `User.name` (fuente unica de verdad) | ✅ | #86, PR #263 (mergeado 2026-07-21) — contrato de API se mantuvo identico, 0 cambios de frontend |

### Requerimientos Parciales

| Requerimiento | Estado | Brecha |
|---------------|--------|--------|
| Autorizacion por dominio | ⚠️ | Policies usan `$user->can()` en HR/Attendance/Payroll/CashAdjustments/Media — pero `ItemPolicy` (Inventory) retorna `true` sin condicion — #400 |
| Rotacion de credenciales expuestas | ⚠️ | Exposicion estatica cerrada (#384), pero las keys ya desplegadas en prod/preview de Cloud Run siguen sin rotar — requiere acceso a GCP fuera de esta automatizacion |
| ids no enumerables en toda la app | ⚠️ | HR/Attendance/Payroll, CashAdjustments y Media ya exponen ULID `public_id`; Inventory (Item/ItemVariant/Stock/...) sigue exponiendo id numerico secuencial — #399 |

### No Implementados (diferidos a proposito)

| Requerimiento | Tarea Backlog |
|---------------|---------------|
| Mobile app | #085 |
| Integracion real de WhatsApp (`WhatsAppService`) | #276 |

---

*Documento actualizado el 2026-08-11 por Claude Code*
