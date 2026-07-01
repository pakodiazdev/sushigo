# ⚙️ Task #212: Vacation Policy Configuration and Auto-Entitlement Generation

## 📖 Story

**English:**
As an Admin, I want the system to automatically generate vacation entitlements at each employee anniversary based on a configurable LFT policy scale, so that HR no longer needs to register entitlements manually and legal compliance is guaranteed.

**Español:**
Como Admin, quiero que el sistema genere automáticamente los derechos vacacionales en cada aniversario del empleado, basándose en una escala configurable de la LFT, para que RH ya no registre derechos manualmente y se garantice el cumplimiento legal.

---

## ✅ Backend Tasks

### Infrastructure
- [x] 📂 Migration: add `termination_type` enum to `employment_periods` (`resignation`, `dismissal`, `contract_end`, `internal_transfer`, `other`)
- [x] 📂 Migration: create `vacation_policies` table (`year_of_seniority`, `entitled_days`, `effective_from`, UNIQUE `(year_of_seniority, effective_from)`)
- [ ] 📂 Migration: alter `vacation_entitlements` — add `seniority_year`, `anniversary_date`, `must_schedule_before`, `expires_at`, `is_manual_override`, `overridden_by`; replace UNIQUE `(employee_id, year)` → `(employee_id, anniversary_date)` **(deferred to #081 refactor)**
- [x] 🔧 Update `EmploymentPeriod` model and `DeactivateEmployeeRequest` to include `termination_type`
- [x] 🔧 `VacationPolicy` model
- [ ] 🔧 Update `VacationEntitlement` model with new fields and casts **(deferred to #081 refactor)**

### Services
- [x] 🔧 `SeniorityService` — `effectiveStartDate(Employee)`, `completedYears(Employee, ?Carbon)`, `nextAnniversary(Employee)`
- [x] 🔧 `entitledDaysForSeniorityYear(int, Carbon)` — integrated into `SeniorityService`
- [ ] 🔧 `VacationEntitlementSyncService` — retroactively generate all past anniversaries on first GET **(deferred to #081 refactor)**

### API
- [x] 🌐 `GET /api/v1/settings/vacation-policy` — list policy rows (admin only)
- [x] 🌐 `POST /api/v1/settings/vacation-policy` — add row (admin only)
- [x] 🌐 `PUT /api/v1/settings/vacation-policy/{id}` — update row (admin only)
- [x] 🌐 `DELETE /api/v1/settings/vacation-policy/{id}` — remove row (admin only)
- [ ] 🌐 Update `GET /employees/{id}/vacation-entitlements` — call sync, return `next_anniversary` + `alerts` **(deferred to #081 refactor)**

### Seeders
- [x] 🌱 `VacationPolicySeeder` — LFT 2023 scale (effective 2023-01-01, years 1–40)
- [ ] 🌱 Update `EmployeeSeeder` / `AttendanceTestSeeder` to set `termination_type` on closed periods **(deferred to #081 refactor)**

### Tests
- [x] 🧪 Unit: `SeniorityServiceTest` — continuity across `internal_transfer`, reset on resignation/dismissal (9 tests)
- [ ] 🧪 Unit: `VacationEntitlementSyncServiceTest` — retroactive generation, correct days from policy **(deferred to #081)**
- [x] 🧪 Feature: `VacationPolicyTest` — CRUD happy path, admin-only (10 tests)
- [ ] 🧪 Feature: update `VacationEntitlementTest` — enriched response with `next_anniversary` and `alerts` **(deferred to #081)**

## ✅ Frontend Tasks

- [x] 📝 Add `VacationPolicy` type to `src/types/attendance-payroll.ts`
- [x] 🔧 `vacation-policy-api.ts` — CRUD service functions
- [x] 🔧 `vacation-policy-hooks.ts` — `useVacationPolicy`, `useCreateVacationPolicy`, `useUpdateVacationPolicy`, `useDeleteVacationPolicy`
- [x] 📱 `VacationPolicyTable` component + integrated into `/configuracion` page
- [ ] 📱 Update `VacationEntitlementSection` — remove "Registrar derecho" button, add next anniversary card and alerts **(deferred to #081 refactor)**

---

## 🎯 Acceptance Criteria

- [x] `termination_type` enum on `employment_periods` distinguishes internal transfers from real terminations
- [x] `VacationPolicy` table seeded with LFT 2023 scale
- [x] `SeniorityService` accumulates seniority across `internal_transfer` and resets on real terminations
- [ ] First GET auto-generates all past anniversaries retroactively **(deferred to #081)**
- [ ] GET response includes `next_anniversary` and `alerts` (must_schedule, expiring) **(deferred to #081)**
- [x] VacationPolicy CRUD endpoints work, admin-only (403 for other roles)
- [x] Frontend settings page renders and allows editing the policy scale
- [x] PHPUnit coverage ≥ 80% on new code (19 tests)
- [x] Cypress E2E: admin views and edits vacation policy

---

## 🔗 References

- **Related PR:** #207 (will be refactored after this issue)
- **LFT:** Art. 76–81, Reforma Vacaciones Dignas 2023 (DOF 2022-12-27)

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `4h` · **Pessimistic:** `8h` · **Tracked:** `5h`

### 📅 Sessions
```json
[
  { "date": "2026-06-29", "start": "17:33", "end": "22:33" }
]
```

---

## 📊 Retrospective

**Estimate:** 4h optimistic / 8h pessimistic  
**Tracked:** 5h  
**Variance:** On estimate (+1h over optimistic)

**What slowed us down:**
- `SeniorityService` had a bug where `orderBy('start_date')` on the `employmentPeriods()` relation (which defaults to `DESC`) produced wrong ordering — fixed with `reorder()`.
- `Employee::factory()->create()` does NOT auto-create an `EmploymentPeriod` — tests needed to create periods explicitly.
- Scope was clarified during planning: `VacationEntitlementSyncService` and the `vacation_entitlements` table alterations were deferred to the #081 refactor to avoid a large cross-branch diff.

**Deferred to #081:**
- Migration to alter `vacation_entitlements` with seniority_year, anniversary_date, alerts fields
- `VacationEntitlementSyncService`
- Update `VacationEntitlementTest` with enriched response
