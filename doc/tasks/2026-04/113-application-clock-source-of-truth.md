# 🕒 Task #113: Implement Application Clock Source of Truth

## 📖 Story

**English:**
As a product team, we need a single business-time source shared by backend and frontend, so that all time-dependent flows behave consistently and can be simulated safely in non-production environments.

**Español:**
Como equipo de producto, necesitamos una sola fuente de tiempo de negocio compartida por backend y frontend, para que todos los flujos dependientes de hora sean consistentes y se puedan simular de forma segura en ambientes no productivos.

---

## 🎯 Objective

Replace direct machine-clock usage in business logic (`Date`, `Date.now()`, `now()`, `Carbon::now()`) with an `ApplicationClock` abstraction controlled by backend and consumed by frontend.

---

## 📌 Scope

Included:

- Backend clock state persistence and service abstraction.
- Devtools endpoints for simulated/system clock modes.
- Frontend shared clock store/hook from API source.
- Migration of attendance-payroll critical business paths.
- Conventions and guardrails to prevent regressions.

Excluded (this task):

- Migrating every legacy feature in one shot.
- Replacing historical date rendering utilities not used for business decisions.

---

## ✅ Technical Tasks

### Phase 1 - Backend Foundation

- [x] 📂 Create migration for `application_clock_state` (single-row invariant).
- [x] 🔧 Implement `ApplicationClock` interface + `DatabaseApplicationClock` service.
- [x] 🔧 Define precedence: `Carbon::getTestNow()` -> simulated clock -> system clock.
- [x] 🔧 Add devtools endpoints (`get`, `set`, `shift`, `reset`) behind env + feature flag.
- [x] 🧪 Add unit tests for clock calculations and mode transitions.
- [x] 🧪 Add feature tests to verify endpoints are blocked in production.

### Phase 2 - Frontend Foundation

- [x] 🔧 Create shared `useApplicationClock()` store/hook using API clock endpoint.
- [x] 🔧 Create centralized frontend timezone resolver (`getFrontendTimezone()`), defaulting to browser timezone.
- [x] 🔧 Add topbar indicator for clock mode (`system` vs `simulated`).
- [x] 🔧 Add debug controls for set/shift/reset in allowed environments.
- [ ] 🔧 Route datetime parse/render utilities through centralized timezone resolver.
- [ ] 🧪 Add tests for store behavior and UI mode rendering.

### Phase 3 - Critical Domain Migration (Attendance/Payroll)

**Backend migrations completed:**
- [x] 🔧 `RecordOvertimeDecisionAction` - Inject `ApplicationClock`, replace `Carbon::now()->utc()` with `$clock->nowUtc()`
- [x] 🔧 `CurrentScheduleController` - Inject `ApplicationClock`, replace `now()` with `$clock->nowInBusinessTz()`
- [x] 🔧 `EmploymentPeriod::durationInDays()` - Add optional `$referenceDate` parameter (callers pass clock value)
- [x] 🔧 `OperatingUnit::scopeActiveEvents()` - Add required `$referenceDate` parameter (callers inject clock)
- [x] 🔧 `ScheduleDayOverride::scopeNotExpired()` - Add required `$referenceDate` parameter

**Pending:**
- [ ] 🔧 Replace business "now" usage in attendance page flows (frontend) with Application Clock data.
- [ ] 🔧 Refactor `code/webapp/src/lib/datetime.ts` consumers that drive business logic.
- [ ] 🧪 Update E2E scenarios to validate simulated-time behavior end-to-end.

### Phase 4 - Hardening

- [ ] 📝 Add backend/frontend conventions for Application Clock usage.
- [ ] 🔧 Add static checks (lint/script) to flag forbidden clock usage in business paths.
- [ ] 🧪 Add regression test cases for timezone-sensitive cutoffs and day boundaries.

---

## 🎯 Acceptance Criteria

- [x] Backend exposes a single Application Clock service used by business-time rules.
- [ ] Frontend business decisions consume backend-provided clock values.
- [x] Time simulation works in `local/devtest/testing` and is blocked in production.
- [ ] Attendance critical flows (check-in/out, close-day, overtime) behave consistently with simulated time.
- [ ] New code conventions are documented and adopted.

---

## 🔗 References

- Architecture:
  - `doc/architecture/application-clock/application-clock.en.md`
  - `doc/architecture/application-clock/application-clock.es.md`
- Conventions:
  - `doc/conventions/backend/application-clock.md`
  - `doc/conventions/frontend/application-clock.md`
- Existing middleware:
  - `code/api/app/Http/Middleware/SetTestTimeMiddleware.php`

---

## ⏱️ Estimates

- **Optimistic:** `12h`
- **Pessimistic:** `24h`
- **Tracked:** `0h`

### 📅 Sessions

```json
[]
```
