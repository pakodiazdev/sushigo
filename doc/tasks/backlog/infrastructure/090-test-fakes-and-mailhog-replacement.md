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
- [ ] Create `database/seeders/Fakes/FakeEmployeesSeeder.php` (N employees via factories, configurable count)
- [ ] Register `fakes-employees` group in `TestReset.php`
- [ ] Verify `php artisan test:reset --seeders=attendance,fakes-employees` works
- [ ] Update `test:reset --list` output to show fakes groups

### Part B — Mailhog Replacement (FileTokenRecorder)
- [ ] Create `PasswordResetTokenRecorder` interface
- [ ] Create `NullTokenRecorder` (production implementation)
- [ ] Create `FileTokenRecorder` (testing/dev implementation, writes to `storage/testing/reset-links/`)
- [ ] Bind implementations in `AppServiceProvider` based on `app()->environment()`
- [ ] Hook recorder into the password reset notification flow
- [ ] Create test-only API route `GET /api/v1/test/reset-link/{email}` (guarded by environment check)
- [ ] Add `storage/testing/` to `.gitignore`
- [ ] Add `storage/testing/` cleanup to `TestReset::truncateAllTables()`

### Part C — Update Cypress
- [ ] Add `test:getResetLink` Cypress task in `cypress.config.ts`
- [ ] Update `employees.cy.ts` to use `test:getResetLink` instead of `mailhog:getResetLink`
- [ ] Verify `employees.cy.ts` passes without Mailhog running
- [ ] Run full `make cypress-run` to confirm no regressions

### Part D — Documentation
- [ ] Update `test-environment-services.md` with implementation details (replace "proposed" with "implemented")
- [ ] Update task tracker

---

## Acceptance Criteria

- [ ] `php artisan test:reset --seeders=attendance,fakes-employees` creates N additional random employees
- [ ] `employees.cy.ts` passes without Mailhog dependency
- [ ] `GET /api/v1/test/reset-link/{email}` returns the reset link in testing/dev environments
- [ ] `GET /api/v1/test/reset-link/{email}` returns 404 in production
- [ ] `storage/testing/` is cleaned on every `test:reset` run
- [ ] All existing Cypress specs pass (`make cypress-run`)

---

## Notes

- The `FileTokenRecorder` pattern can be reused for future services (SMS, push notifications)
- The `Fakes/` namespace convention is documented in `test-data-seeders.md` — follow the naming pattern `Fake{Entity}Seeder.php`
- Fakes seeders depend on Testing seeders (base data must exist first)
