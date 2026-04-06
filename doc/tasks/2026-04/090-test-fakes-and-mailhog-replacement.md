# 🔧 Task #090: Fakes Seeders and Mailhog Replacement for E2E Tests

> Spawned from [Task #089](../../2026-04/089-refactor-testing-strategy.md) Phase 3 remaining items.

## Story

**English:**
As a developer, I want Cypress tests to be independent of Mailhog and have a Fakes seeder namespace for volume data, so that E2E tests are reliable in CI (no external service dependencies) and I can test pagination/list views with configurable record counts.

---

## Context

Task #089 established the Testing seeder architecture (`Testing/`, `Fakes/`, `Development/`) and documented the test environment services convention (DI-based service replacement). This task implements the remaining items:
- `Fakes/` namespace with the first fake seeder
- `FileTokenRecorder` to eliminate Mailhog dependency from `employees.cy.ts`
- Cleanup of `storage/testing/` artifacts in `test:reset`

**Convention references:**
- `doc/conventions/testing/test-data-seeders.md` — Seeder categories
- `doc/conventions/testing/test-environment-services.md` — Service replacement pattern

---

## Technical Tasks

### Part A — Fakes Namespace
- [x] Create `database/seeders/Fakes/FakeEmployeesSeeder.php` (N employees via factories, configurable count)
- [x] Register `fakes-employees` group in `TestReset.php`
- [x] Verify `php artisan test:reset --seeders=attendance,fakes-employees` works (~2s)
- [x] Update `test:reset --list` output to show fakes groups

### Part B — Mailhog Replacement (FileTokenRecorder)
- [x] Create `PasswordResetTokenRecorder` interface (`app/Contracts/`)
- [x] Create `NullTokenRecorder` (production — no-op)
- [x] Create `FileTokenRecorder` (testing/dev — writes to `storage/testing/reset-links/`)
- [x] Bind implementations in `AppServiceProvider` based on `app()->environment()`
- [x] Hook recorder into `ForgotPasswordAction.generateResetLink()`
- [x] Add `storage/testing/` to `.gitignore`
- [x] Add `storage/testing/` cleanup to `TestReset::clearTestArtifacts()`

### Part C — Update Cypress
- [x] Add `test:getResetLink` Cypress task in `cypress.config.ts`
- [x] Update `employees.cy.ts` to use `test:getResetLink` instead of `mailhog:getResetLink`
- [x] Verify `employees.cy.ts` passes without Mailhog running
- [x] Run full `make cypress-run` to confirm no regressions

### Part D — Documentation
- [x] Update `test-environment-services.md` with implementation details (status: ✅ Implemented)
- [x] Update task tracker

---

## Verification Results

- `php artisan test:reset --seeders=fakes-employees` → ~1.9s ✅
- `php artisan test:reset --seeders=attendance,fakes-employees` → ~2s ✅
- `FileTokenRecorder` record/retrieve/clear cycle → works ✅
- `TestResetCommandTest` → 14 tests passed ✅
- Full PHPUnit suite → 442 tests, 1477 assertions, all passed ✅
- Laravel Pint → all files pass ✅
- ESLint + TypeScript → 0 errors ✅
- Full Cypress suite → 6 specs, 21 tests, all passed ✅ (employees.cy.ts without Mailhog)

---

## Acceptance Criteria

- [x] `php artisan test:reset --seeders=attendance,fakes-employees` creates N additional random employees
- [x] `employees.cy.ts` passes without Mailhog dependency
- [x] `storage/testing/` is cleaned on every `test:reset` run
- [x] All existing Cypress specs pass — `make cypress-run` (6 specs, 21 tests)

---

## Notes

- The `FileTokenRecorder` pattern can be reused for future services (SMS, push notifications)
- The `Fakes/` namespace convention is documented in `test-data-seeders.md` — follow the naming pattern `Fake{Entity}Seeder.php`
- Fakes seeders depend on Testing seeders (base data must exist first)
- Cypress task uses artisan tinker to call `FileTokenRecorder->retrieve()` directly (avoids HTTP/SSL complexity)
- The `mailhog:getResetLink` task is kept but marked `@deprecated` in `cypress.config.ts`
