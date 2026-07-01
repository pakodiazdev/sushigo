# ⚙️ Task #212: Vacation Policy Configuration and Auto-Entitlement Generation

## 📖 Story

**English:**
As an Admin, I want the system to automatically generate vacation entitlements at each employee anniversary using the active LFT rule, so that HR no longer needs to register entitlements manually and legal compliance is guaranteed.

**Español:**
Como Admin, quiero que el sistema genere automáticamente los derechos vacacionales en cada aniversario del empleado usando la regla LFT activa, para que RH ya no registre derechos manualmente y se garantice el cumplimiento legal.

---

## 🏗️ Design Decision (post-rebase onto #081)

The original design used a `vacation_policies` DB table (configurable LFT scale). After #081 was merged with the `VacationEntitlementRule` strategy pattern, the DB-driven policy table was dropped in favor of the IoC-bound `VacationsLFTMX` strategy. This keeps the rule in code (where it belongs for a legal standard) and eliminates CRUD surface.

`SeniorityService` was refactored to inject `VacationEntitlementRule` instead of querying `VacationPolicy`. The auto-generation runs as an Artisan command (`vacation:generate-entitlements`) rather than on first GET.

---

## ✅ Backend Tasks

- [x] 📂 Migration: add `termination_type` enum to `employment_periods`
- [x] 🔧 Update `EmploymentPeriod` model with `termination_type` cast
- [x] 🔧 Update `DeactivateEmployeeRequest` + `DeactivateEmployeeController` to accept `termination_type`
- [x] 🔧 `TerminationType` enum — `resetsSeniority()` returns false only for `internal_transfer`
- [x] 🔧 `SeniorityService` — `effectiveStartDate()`, `completedYears()`, `nextAnniversary()`, `entitledDaysForSeniorityYear()` — delegates to injected `VacationEntitlementRule`
- [x] 🔧 `vacation:generate-entitlements` artisan command — iterates active employees, creates `VacationEntitlement` for each past anniversary not yet registered
  - `--dry-run` — preview without saving
  - `--employee=ID` — process a single employee
- [x] 🔧 Add `settings.manage` permission to `PermissionSeeder`
- [x] 🧪 Unit: `SeniorityServiceTest` — 9 tests covering continuity, resets, completed years, next anniversary
- [x] 🧪 Feature: `GenerateAnniversaryEntitlementsTest` — 5 tests: creates past years, skips existing, dry-run, employee filter, no-completed-years
- [x] 🌴 `VacationEntitlementService` — shared by command, endpoint, and seeder; `generateMissing()` creates pending anniversaries, `summary()` returns `seniority_years` + `next_anniversary_date`
- [x] 🔌 `ListVacationEntitlementsController` auto-generates missing anniversaries on read and returns the seniority summary as `meta`
- [x] 🗑️ Removed manual "Registrar derecho" endpoint, request, route, and `vacation.manage` permission
- [x] 🌱 `VacationEntitlementSeeder` to backfill entitlements for existing employees

## ✅ Frontend Tasks

- [x] 📝 Add `TerminationType` to `src/types/attendance-payroll.ts`
- [x] 📱 `Tabs` + `TabPanel` UI components (`src/components/ui/tabs.tsx`)
- [x] 📱 `PunctualityConfigSection` — full ranges/bonus-groups form (superseded the initial placeholder)
- [x] 🔌 `/configuracion` page refactored: `requireRole('super-admin')` → `requirePermission('settings.manage')`, tabs layout with Puntualidad tab
- [x] 🎨 Removed manual registration UI (button/form) from employee vacation section
- [x] 🌴 `VacationSection` shows seniority summary (years of tenure + next anniversary date) from the new `meta`
- [x] 🔨 Extracted `PunctualityRangesFields`/`BonusGroupsSection` into shared `punctuality-config-shared.tsx`, removing 45% code duplication between the settings tab and the standalone route page (SonarCloud)
- [x] 🐛 Marked `Tabs`/`TabPanel` props `readonly` (SonarCloud `typescript:S6759`)

---

## 🎯 Acceptance Criteria

- [x] `termination_type` on `employment_periods` distinguishes internal transfers from real terminations
- [x] `SeniorityService` accumulates seniority across `internal_transfer` and resets on resignation/dismissal/contract_end
- [x] `vacation:generate-entitlements` creates `VacationEntitlement` records for all past anniversaries using `VacationsLFTMX`
- [x] Dry-run mode previews without saving
- [x] `/configuracion` accessible to users with `settings.manage` permission (not only super-admin)
- [x] GET `/employees/{employee}/vacation-entitlements` auto-generates missing anniversaries and returns a seniority summary — manual registration endpoint removed
- [x] PHPUnit: 14 new tests passing (9 unit + 5 feature), full suite green (957 tests)
- [x] Vitest: full suite green (195 files / 2920 tests)
- [x] SonarCloud quality gate green for both `api` and `webapp` — 0 new bugs/vulnerabilities/code smells/hotspots, coverage ≥ 80%, duplication ≤ 3% on new code
- [ ] Cypress E2E for anniversary command — deferred to dedicated ops task

---

## 🔗 References

- **PR:** #213
- **Depends on:** #081 (merged — provides `VacationEntitlementRule`, `VacationsLFTMX`, `vacation_entitlements` table)
- **LFT:** Art. 76, Reforma Vacaciones Dignas 2022 (DOF 2022-12-27)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `8h` · **Tracked:** `10h15m`

### 📅 Sessions
```json
[
  { "date": "2026-06-29", "start": "17:33", "end": "22:33" },
  { "date": "2026-06-30", "start": "14:00", "end": "17:00" },
  { "date": "2026-06-30", "start": "20:30", "end": "21:15" },
  { "date": "2026-07-01", "start": "00:30", "end": "01:15" },
  { "date": "2026-07-01", "start": "12:15", "end": "13:00" }
]
```

---

## 📊 Retrospective

**Estimated:** 4h–8h · **Tracked:** ~10h15m · **Variance:** over pessimistic estimate (+2h15m)

**What slowed us down:**
- **Workspace collision with #081 (+1h):** sushigo-b had implemented #212 with the `vacation_policies` DB approach. After #081 merged with the strategy pattern, the branch had to be fully rebased and the architecture adapted — `vacation_policies` CRUD dropped, `SeniorityService` refactored to inject `VacationEntitlementRule`, new command written.
- **`reorder()` bug in SeniorityService (+20m):** `employmentPeriods()` relation defaults to `DESC`; using plain `orderBy('start_date')` appended a secondary sort instead of replacing it. Fixed with `reorder('start_date', 'asc')`.
- **Test setup for EmploymentPeriod (+20m):** `Employee::factory()->create()` does not auto-create periods — every test had to create them explicitly.
- **Scope grew after the initial close (+2h15m):** the task was closed once (first two sessions, 8h) but three follow-up sessions were needed: (1) switching from command-only generation to auto-generate-on-read and removing the manual registration endpoint/UI; (2) adding the `/fix-tests` skill and a seniority summary (`meta`) to the entitlements endpoint, plus fixing a stale `ClockDebugPanel` test unrelated to this issue but caught by the same run; (3) a full `/sonar-review` pass on webapp, which found `punctuality-config-section.tsx` was a near-duplicate of the existing `punctuality-config.tsx` route (45% duplication) and required extracting shared components (`punctuality-config-shared.tsx`) plus new tests to bring new-code coverage from 27% to 90%.

**What went well:** The strategy pattern made `SeniorityService` refactor trivial (one constructor injection, one method body swap). The command tests are fast and deterministic using `RefreshDatabase` + relative dates. Running `/fix-tests` and `/sonar-review` as separate passes after the feature was functionally complete caught real issues (a stale test, a genuine 45% duplication) cheaply, before merge, without blocking the main implementation work.
