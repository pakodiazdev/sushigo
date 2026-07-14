# 💳 Task #214: Allow Configurable Vacation Entitlement Policies Beyond LFT Minimum

**GitHub Issue:** [#214](https://github.com/pakodiazdev/sushigo/issues/214)

## 📖 Story

**English:**
As a Tenant Admin, I want to configure a vacation entitlement rule more generous than the LFT minimum — either company-wide or for a specific employee — so the system reflects our actual policy instead of only the legal floor.

**Español:**
Como Admin del tenant, quiero configurar una regla de derecho vacacional más generosa que el mínimo de la LFT — ya sea para toda la empresa o para un empleado específico — para que el sistema refleje nuestra política real y no solo el piso legal.

---

## 🧠 Context

Task #081 implemented vacation day calculation using a Strategy pattern (`VacationEntitlementRule`), but locked the system to a single strategy (`VacationsLFTMX`) resolved via a fixed IoC binding. This debt extends the pattern with two additional levels, both reusing the same generic custom-table strategy:

1. **Company-wide policy** — tenant admin selects "LFT México 2022" (default) or "Política personalizada" in `/configuracion`, and defines a custom years→days table when personalizada is selected.
2. **Per-employee override** — an employee can have a `ContractualPolicy` override (same custom-table mechanism, employee-scoped) that takes precedence over the tenant default.

Since there is no tenant/company model in this codebase yet (single-instance app; multi-tenancy is planned as one DB per tenant, not a shared `tenant_id` column), tenant-level settings are stored in a new singleton table, not scoped by tenant ID.

---

## 🏗️ Design Decisions

- **Generic custom strategy:** one `CustomVacationPolicy` class (implements `VacationEntitlementRule`) is parameterized with a day table + label + key, and is reused for both `CustomCompanyPolicy` (tenant-level) and `ContractualPolicy` (employee-level) — no separate classes.
- **Custom table shape:** free-form list of `{ years_from, days }` rows (not fixed LFT-style brackets). `calculate($years)` picks the row with the highest `years_from <= years`. Display `table()` derives ranges between consecutive `years_from` values.
- **Tenant-level storage:** new singleton table `vacation_policy_settings` (`active_rule_key`) + `vacation_policy_tiers` (rows), mirroring the existing `overtime_lft_tiers` admin-editable-table pattern (full-replace PUT). No `tenant_id` column — future multi-tenancy is one DB per tenant.
- **Employee-level storage:** two new nullable columns on `employees` — `vacation_entitlement_rule_key` (null = inherit tenant default) and `vacation_entitlement_custom_table` (JSON) — per the issue's suggested schema.
- **Resolution order:** `VacationEntitlementResolver` — employee override (if set) → tenant custom policy (if active) → `VacationsLFTMX` (default, zero config).
- **`VacationEntitlementRule` gains a `key(): string` method** (stable identifier for `rule_key`/labeling), replacing `class_basename($rule)` which can no longer distinguish "company" vs "contractual" instances of the same PHP class.
- **`VacationEntitlementService` and `SeniorityService`** move from constructor-injecting a single `VacationEntitlementRule` to injecting `VacationEntitlementResolver` and resolving per employee.

---

## ✅ Backend Tasks

- [x] 🔧 `VacationEntitlementRule` interface — add `key(): string`
- [x] 🔧 `VacationsLFTMX::key()` → `'VacationsLFTMX'`
- [x] ✨ `app/Services/VacationRules/CustomVacationPolicy.php` — generic table-driven strategy
- [x] ✨ `app/Services/VacationEntitlementResolver.php` — employee override → tenant custom → LFT default
- [x] 🔨 `VacationEntitlementService` — inject resolver instead of fixed rule; resolve per employee in `pendingAnniversaries`, `generateMissing`, `summary` (adds `active_rule_label` to summary)
- [x] 🔨 `SeniorityService` — inject resolver instead of fixed rule; resolve per employee in `nextAnniversary`; removed unused `entitledDaysForSeniorityYear` (no employee context, no callers)
- [x] 📂 Migration `create_vacation_policy_settings_table` — singleton row (`active_rule_key` default `VacationsLFTMX`)
- [x] 📂 Migration `create_vacation_policy_tiers_table` — `years_from`, `days`, `sort_order` (mirrors `overtime_lft_tiers`)
- [x] 📂 Migration `add_vacation_entitlement_rule_to_employees_table` — `vacation_entitlement_rule_key` (nullable), `vacation_entitlement_custom_table` (nullable json)
- [x] 🔧 `VacationPolicySetting` model (+ `current()` singleton accessor), `VacationPolicyTier` model
- [x] 🌐 `GET/PUT /api/v1/vacation-policy` — `ListVacationPolicyController` / `UpdateVacationPolicyController` (full-replace tiers, atomic transaction)
- [x] 🌐 `PUT /api/v1/employees/{employee}/vacation-policy-override` — `UpdateEmployeeVacationPolicyController`
- [x] 🔑 New permission `vacation-policy.manage` in Production/Development/Testing seeders (group "Asistencia", granted to admin + super-admin)
- [x] 🧪 Unit tests: `CustomVacationPolicyTest`, `VacationEntitlementResolverTest`
- [x] 🧪 Feature tests: `VacationPolicySettingsApiTest`, `EmployeeVacationPolicyOverrideApiTest`
- [x] 🧪 Update `SeniorityServiceTest` for the new resolver-based constructor

## ✅ Frontend Tasks

- [x] 📝 Types: `VacationPolicyTier`, `VacationPolicySettings`, `UpdateVacationPolicyPayload`, employee override payload/response
- [x] 🔧 `src/services/vacation-policy-api.ts` + `vacation-policy-hooks.ts` (mirrors `overtime-lft-tiers-*`)
- [x] 🔧 `components/settings/use-vacation-policy-section.ts` + `vacation-policy-section.tsx` — rule selector (LFT / personalizada) + conditional tiers editor (kept alongside the component per the Custom Hook Convention, unlike overtime's `pages/attendance/` split)
- [x] 📱 `vacation-policy-section.tsx` wired into `configuracion.tsx` as a new "Vacaciones" tab, gated by `vacation-policy.manage`
- [x] 🔧 `employee-vacation-policy-api.ts`/`hooks.ts` + `VacationPolicyOverride` component in the employee's Vacaciones section (toggle "Política contractual" + tiers editor)
- [x] 📱 Replace hardcoded "LFT México 2022" badge in `vacation-section.tsx` with the backend-resolved `active_rule_label`
- [x] ✅ Vitest coverage for all new services/hooks/components
- [x] ✅ E2E: `cypress/e2e/vacation-policy-settings.cy.ts` — verified passing against the sushigo-d E2E stack

---

## 🎯 Acceptance Criteria

- [x] Tenant admin can select an active vacation rule from a "Reglas aplicables" dropdown in company settings
- [x] A custom policy allows defining a day table (years_from → days) via UI
- [x] Per-employee override field exists and takes precedence over the tenant default
- [x] `VacationsLFTMX` remains the default and requires zero configuration
- [x] All existing entitlement calculations continue to work unchanged

---

## 🔗 References

- **Blocked by / follow-up to:** #081
- Art. 76 LFT (2022 reform) — baseline rule implemented in `VacationsLFTMX`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `7h` · **Tracked:** `7h09m`

### 📅 Sessions
```json
[
  { "date": "2026-07-14", "start": "02:25", "end": "09:34" }
]
```

---

## 📊 Retrospective

**Estimated:** 4h–7h · **Tracked:** 7h09m · **Overrun:** +9m (within pessimistic estimate)

**Why it took the full pessimistic estimate:**

- **No existing tenant/settings infrastructure:** the issue assumed a `tenant_settings`/`company_configs` table would exist to extend — it didn't. Had to design and build the singleton `vacation_policy_settings` table from scratch, closely mirroring the `overtime_lft_tiers` admin-editable-table pattern found during research.
- **Two-level resolution, one generic strategy:** per the user's direction, both the tenant-level `CustomCompanyPolicy` and the employee-level `ContractualPolicy` had to reuse a single `CustomVacationPolicy` class — required adding a `key()` method to the `VacationEntitlementRule` interface and refactoring both `VacationEntitlementService` and `SeniorityService` off a fixed constructor-injected rule onto a per-employee `VacationEntitlementResolver`.
- **Shared test-database collision (+10-15m):** `phpunit.xml` hardcodes `DB_DATABASE=mydb_test` for every workspace instead of the per-workspace `sushigo_ws_<letter>` used in dev mode — another workspace (sushigo-e) running its own test suite concurrently caused deadlocks and corrupted migration state. Worked around it by creating a workspace-local `sushigo_ws_d_test` database and exporting `DB_DATABASE` for test runs, without touching the shared `phpunit.xml`.
- **E2E stack cold start:** no E2E Docker stack was running for this workspace; `make e2e WORKSPACE=sushigo-d` (build + start) plus two iterations to fix Cypress selector scoping (an unscoped `cy.contains('td', ...)` matched a hidden column in the background employee list table instead of the intended entitlement row) added time but caught a real selector bug before merge.

**What went well:** the `overtime_lft_tiers` precedent (found during Phase 2 research) made the tenant-level tiers table, its full-replace PUT endpoint, and its frontend editor nearly a direct port — no design iteration needed there. All 1177 PHPUnit tests and 3326 Vitest tests passed on first full-suite run after the refactor; the resolver change required no production behavior fixes, only test fixture updates (new required `Employee` fields) and one `SeniorityServiceTest` constructor-signature update. The E2E spec confirmed the full stack — tenant policy change → per-employee entitlement calculation → UI display — works correctly end-to-end on the first fully-scoped run.
