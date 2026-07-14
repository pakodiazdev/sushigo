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

- [ ] 🔧 `VacationEntitlementRule` interface — add `key(): string`
- [ ] 🔧 `VacationsLFTMX::key()` → `'VacationsLFTMX'`
- [ ] ✨ `app/Services/VacationRules/CustomVacationPolicy.php` — generic table-driven strategy
- [ ] ✨ `app/Services/VacationEntitlementResolver.php` — employee override → tenant custom → LFT default
- [ ] 🔨 `VacationEntitlementService` — inject resolver instead of fixed rule; resolve per employee in `pendingAnniversaries`, `generateMissing`, `summary` (adds `active_rule_label` to summary)
- [ ] 🔨 `SeniorityService` — inject resolver instead of fixed rule; resolve per employee in `nextAnniversary`; remove unused `entitledDaysForSeniorityYear` (no employee context, no callers)
- [ ] 📂 Migration `create_vacation_policy_settings_table` — singleton row (`active_rule_key` default `VacationsLFTMX`)
- [ ] 📂 Migration `create_vacation_policy_tiers_table` — `years_from`, `days`, `sort_order` (mirrors `overtime_lft_tiers`)
- [ ] 📂 Migration `add_vacation_entitlement_rule_to_employees_table` — `vacation_entitlement_rule_key` (nullable), `vacation_entitlement_custom_table` (nullable json)
- [ ] 🔧 `VacationPolicySetting` model (+ `current()` singleton accessor), `VacationPolicyTier` model
- [ ] 🌐 `GET/PUT /api/v1/vacation-policy` — `ListVacationPolicyController` / `UpdateVacationPolicyController` (full-replace tiers, atomic transaction)
- [ ] 🌐 `PUT /api/v1/employees/{employee}/vacation-policy-override` — `UpdateEmployeeVacationPolicyController`
- [ ] 🔑 New permission `vacation-policy.manage` in Production/Development/Testing seeders (group "Asistencia", granted to admin + super-admin)
- [ ] 🧪 Unit tests: `CustomVacationPolicyTest`, `VacationEntitlementResolverTest`
- [ ] 🧪 Feature tests: `VacationPolicySettingsApiTest`, `EmployeeVacationPolicyOverrideApiTest`
- [ ] 🧪 Update `SeniorityServiceTest` for the new resolver-based constructor

## ✅ Frontend Tasks

- [ ] 📝 Types: `VacationPolicyTier`, `VacationPolicySettings`, `UpdateVacationPolicyPayload`, employee override payload/response
- [ ] 🔧 `src/services/vacation-policy-api.ts` + `vacation-policy-hooks.ts` (mirrors `overtime-lft-tiers-*`)
- [ ] 🔧 `use-vacation-policy-config-page.ts` + `vacation-policy-shared.tsx` — rule selector (LFT / personalizada) + conditional tiers editor
- [ ] 📱 `vacation-policy-section.tsx` wired into `configuracion.tsx` as a new "Vacaciones" tab, gated by `vacation-policy.manage`
- [ ] 🔧 Employee-level override service/hook + small section in employee detail (toggle "Política contractual" + tiers editor)
- [ ] 📱 Replace hardcoded "LFT México 2022" badge in `vacation-section.tsx` with the backend-resolved `active_rule_label`
- [ ] ✅ Vitest coverage for all new services/hooks/components

---

## 🎯 Acceptance Criteria

- [ ] Tenant admin can select an active vacation rule from a "Reglas aplicables" dropdown in company settings
- [ ] A custom policy allows defining a day table (years_from → days) via UI
- [ ] Per-employee override field exists and takes precedence over the tenant default
- [ ] `VacationsLFTMX` remains the default and requires zero configuration
- [ ] All existing entitlement calculations continue to work unchanged

---

## 🔗 References

- **Blocked by / follow-up to:** #081
- Art. 76 LFT (2022 reform) — baseline rule implemented in `VacationsLFTMX`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `7h` · **Tracked:** _in progress_

### 📅 Sessions
```json
[
  { "date": "2026-07-14", "start": "02:25", "end": "?" }
]
```
