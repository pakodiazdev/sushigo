# 🌴 Task #081: Register Vacation Entitlement

## 📖 Story

**English:**
As an Admin, I want to register an employee's annual vacation entitlement calculated automatically by the active legal rule (LFT), so the system can track their available balance without manual data entry errors.

**Español:**
Como Admin, quiero registrar el derecho vacacional anual de un empleado calculado automáticamente por la regla legal activa (LFT), para que el sistema controle su saldo disponible sin errores de captura manual.

---

## 🏗️ Design Decisions

### Strategy Pattern for vacation rules
The backend uses a `VacationEntitlementRule` interface with a single concrete strategy `VacationsLFTMX` (LFT 2022 reform, Art. 76). The API endpoint accepts only `{ year }` — the backend resolves the active strategy and calculates `entitled_days` from the employee's seniority. The calculated value is stored in the DB for historical accuracy (rules may change later). Additional strategies (per-company generosity policies) are deferred to issue #214.

### Seniority calculation
`years_of_service = year - earliest_employment_period_start_year`. Simplified to year-based (not day-exact). For now this is sufficient for LFT compliance.

### Frontend display
"LFT México 2022" shown as read-only badge. Year-only `<select>` form (no manual `entitled_days` input). Auto-calculation note displayed below the form. Remaining days table with color-coding: red if 0, amber if ≤ 3.

---

## ✅ Backend Tasks

- [x] 📂 `app/Contracts/VacationEntitlementRule.php` — interface: `calculate(int $years): int`, `label(): string`, `table(): array`
- [x] 🔧 `app/Services/VacationRules/VacationsLFTMX.php` — LFT 2022 Art. 76 table implementation
- [x] 📂 Migration `create_vacation_entitlements_table` — employee_id (FK), year (smallint), entitled_days (smallint), used_days (smallint default 0), rule_key (string), timestamps; UNIQUE(employee_id, year)
- [x] 🔧 `VacationEntitlement` model — `remainingDays()`: entitled_days − used_days
- [x] 🌐 `POST /api/v1/employees/{id}/vacation-entitlements` — body: `{ year }`; auto-calculates entitled_days; 422 if already exists for that year
- [x] 🌐 `GET /api/v1/employees/{id}/vacation-entitlements` — history by year desc with remaining_days computed
- [x] 🧪 Feature tests: create (verifies auto-calculated days), duplicate rejected (422), unauthorized (403), year required (422), list ordered desc
- [x] 🧪 Unit test `VacationsLFTMXTest` — 17 tests verifying LFT table values for years 1–31+

## ✅ Frontend Tasks

- [x] 📝 Add `VacationEntitlement` type to `src/types/attendance-payroll.ts`
- [x] 🔧 `getEntitlements(employeeId)` + `registerEntitlement(employeeId, { year })` in `src/services/vacation.service.ts`
- [x] 🔧 `useVacationEntitlements` + `useRegisterEntitlement` hooks in `src/services/vacation-hooks.ts`
- [x] 🔧 `use-vacation-section.ts` hook — state + mutations for the section
- [x] 📱 `vacation-section.tsx` — table (year, días ganados, días usados, días restantes) + "Registrar derecho" button + year-only form + "LFT México 2022" badge
- [x] 🔌 Wire `<VacationSection>` into `employee-detail-view.tsx`
- [x] ✅ `src/services/__tests__/vacation-api.test.ts` — 2 service function tests
- [x] ✅ `src/services/__tests__/vacation-hooks.test.tsx` — 4 hook tests
- [x] ✅ `src/components/employees/__tests__/vacation-section.test.tsx` — 9 component tests
- [x] ✅ `src/components/employees/__tests__/use-vacation-section.test.ts` — 6 hook tests

---

## 🎯 Acceptance Criteria

- [x] Admin can register annual entitlement for a year and see it in the table with remaining days
- [x] Registering the same year twice shows a friendly duplicate error
- [x] The form shows only a year selector; days are calculated automatically (no manual input)
- [x] "LFT México 2022" is shown read-only as a badge
- [ ] Remaining days updates as vacation requests are approved — deferred to #082

---

## 🔗 References

- **Backlog:** AP-052, AP-053 · RF-26
- **Tech debt:** #214 — per-company configurable vacation policies

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h` · **Pessimistic:** `3h` · **Tracked:** `5h30m`

### 📅 Sessions
```json
[
  { "date": "2026-06-30", "start": "10:00", "end": "13:15" },
  { "date": "2026-06-30", "start": "13:30", "end": "15:45" }
]
```

---

## 📊 Retrospective

**Estimated:** 2h–3h · **Tracked:** 5h30m · **Overrun:** +2h30m

**Why it took longer:**

- **Workspace collision (+45m):** `sushigo-b` had already implemented #081 with the old manual-input design and opened PR #207. Resolving the conflict (inspecting both branches, deciding on approach, force-pushing) added unplanned time.
- **Strategy pattern redesign (+30m):** The original issue spec used a manual `entitled_days` input. Pivoting mid-session to the strategy pattern (`VacationEntitlementRule` interface + `VacationsLFTMX`) added architecture work not in the original estimate.
- **SonarCloud quality gate (+1h15m):** Three iterations of fixes: Pint `binary_operator_spaces` in the test file, three nested ternary code smells in the frontend, and coverage below 80% (required writing 3 new test files — `vacation-hooks.test.tsx`, `vacation-section.test.tsx`, `use-vacation-section.test.ts`). Also a TypeScript error in CI that passed locally but failed on strict tsc in CI.

**What went well:** PHPUnit tests caught the seniority calculation correctly on first write. The strategy pattern binding via IoC was clean and required no extra wiring. LFT table unit tests (17 cases) gave high confidence.
