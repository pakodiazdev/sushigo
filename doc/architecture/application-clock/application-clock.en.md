# Application Clock Architecture (EN)

## Scope

Define a single source of truth for business time across backend and frontend.
The goal is to remove direct dependency on client/server machine clocks for business rules.

---

## 1) Current Problem

The app currently mixes three clocks:

- Client clock (`Date`, `Date.now()`) for UI defaults and business-related decisions.
- Server clock (`now()`, `Carbon::now()`) for business logic and persistence.
- Test clock (`X-Test-Time` + `SetTestTimeMiddleware`) for E2E/testing.

This creates drift between layers, hard-to-reproduce bugs, and fragile manual testing.

---

## 2) Goals

- One business clock observable system-wide (`application now`).
- Time simulation in non-production environments without changing OS time.
- Keep technical timestamps (`created_at`, `updated_at`) on real system time.
- Enforce conventions so new business logic does not read machine clock directly.

Non-goals:

- Replacing historical date rendering from API/DB.
- Changing semantics of `time` columns that represent local wall-clock schedule values.

---

## 3) Definitions

- `instant_utc`: absolute instant in UTC (`2026-04-16T19:25:00Z`).
- `business_timezone`: business timezone (e.g., `America/Mexico_City`).
- `application_now_utc`: current instant provided by `ApplicationClock`.
- `business_date`: local date derived from `application_now_utc` in `business_timezone`.
- `technical_timestamp`: infrastructure/audit timestamp from real system clock.

---

## 4) Architecture Principles

1. Backend owns the source of truth for business time.
2. Frontend consumes backend time and does not invent local business time.
3. All business comparisons use `application_now_utc`.
4. Business instants are stored in UTC.
5. Clock simulation is disabled in production.

---

## 5) Clock State Model

Modes:

- `system`: `application_now_utc = system_now_utc`
- `simulated`: `application_now_utc = base_datetime_utc + (system_now_utc - started_real_datetime_utc)`

Proposed table: `application_clock_state`

- `id` (PK)
- `mode` enum: `system | simulated`
- `base_datetime_utc` datetime nullable
- `started_real_datetime_utc` datetime nullable
- `timezone` varchar (default `app.business_timezone`)
- `updated_by` FK nullable
- `updated_at` timestamp

Invariants:

- Exactly one active row.
- `base_datetime_utc` and `started_real_datetime_utc` required for `simulated`.
- Both fields null for `system`.

---

## 6) Backend Service

Create a central abstraction:

- `App\Support\Clock\ApplicationClock` (interface)
- `App\Support\Clock\DatabaseApplicationClock` (implementation)

Recommended API:

- `nowUtc(): CarbonImmutable`
- `todayInBusinessTz(): string` (`Y-m-d`)
- `nowInBusinessTz(): CarbonImmutable`
- `mode(): ClockMode`

Rule:

- Business Actions/Services must inject `ApplicationClock`.
- Avoid new `now()`/`Carbon::now()` in business rules.
- `now()` remains valid for technical/infrastructure timestamps.

---

## 7) HTTP Contract (devtools)

Only in `local`, `devtest`, `testing`.

- `GET /api/devtools/clock`
  - returns `mode`, `application_now_utc`, `business_timezone`, `business_date`.
- `POST /api/devtools/clock/set`
  - body: `datetime` (ISO8601 with timezone), `mode=simulated`.
- `POST /api/devtools/clock/shift`
  - body: `minutes` (int, can be negative).
- `POST /api/devtools/clock/reset`
  - switches to `mode=system`.

Security:

- Environment guard + explicit feature flag (`CLOCK_SIMULATION_ENABLED=true`).
- Admin-only permission in devtools.
- Endpoint disabled/unavailable in production.

---

## 8) Frontend Integration

Create a central `ApplicationClockStore`/hook that reads `GET /api/devtools/clock` and exposes:

- `nowUtcIso`
- `businessDate`
- `mode`
- `isSimulated`

Also create a centralized frontend timezone service, for example `FrontendTimezoneService`, to resolve parse/render timezone:

- Future-first priority: user-preferred timezone (once profile preference exists).
- Current priority: browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

Frontend rules:

- Do not use `new Date()` for business state decisions (today/late/active).
- `new Date()` is allowed for pure rendering of persisted timestamps, always using the centralized timezone source.
- Form defaults that depend on "now" must come from Application Clock.
- User-visible datetime parse/render must use the centralized timezone (no hardcoded offsets).

---

## 9) `X-Test-Time` Compatibility

Current useful behavior:

- `SetTestTimeMiddleware` already allows request-scoped deterministic time in tests.

Strategy:

- Keep `X-Test-Time` for deterministic request-level tests.
- `ApplicationClock` must honor `Carbon::getTestNow()` when present.
- Recommended precedence:
  1. `Carbon::getTestNow()` (tests)
  2. `application_clock_state` (manual simulation)
  3. real system clock

---

## 10) Incremental Rollout

Phase 1: backend foundation

- `application_clock_state` migration
- `ApplicationClock` service
- devtools endpoints
- unit/feature tests for security and behavior

Phase 2: frontend base consumption

- global clock hook/store
- topbar mode badge
- debug panel for set/reset/shift

Phase 3: migrate critical domains

- attendance/payroll (check-in, close-day, overtime)
- leaves and "today"-dependent rules
- now-sensitive form defaults

Phase 4: hardening

- lint/checks to detect `Date.now()`/`new Date()` in frontend business paths
- PR checklist item: "uses ApplicationClock?"
- E2E coverage with simulated clock

---

## 11) Risks and Mitigations

- Risk: mixing technical and business timestamps.
  - Mitigation: explicit field-level convention and PR review checklist.

- Risk: simulation accidentally enabled in production.
  - Mitigation: dual guard (environment + feature flag) plus security tests.

- Risk: timezone drift in frontend.
  - Mitigation: backend always provides `application_now_utc` and `business_date`.

---

## 12) Architecture Acceptance Criteria

- A single backend service provides business "now".
- Frontend uses backend-provided clock for business time decisions.
- No new direct machine-clock usage in business logic.
- End-to-end time simulation works in non-production environments.
