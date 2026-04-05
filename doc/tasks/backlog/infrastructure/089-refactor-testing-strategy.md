# 🔨 Task #089: Refactor Testing Strategy and Optimize Cypress E2E Suite

> GitHub Issue: [#16](https://github.com/jfcodiaz/sushigo/issues/16)

## Story

**English:**
As a developer, I want a documented testing strategy with clear rules about what belongs in Cypress vs Vitest vs PHPUnit, so that the E2E suite stays fast and tests live at the appropriate level of the testing pyramid.

---

## Baseline Performance (before)

| Spec | Duration | Tests |
|---|---|---|
| attendance-checkin.cy.ts | 00:55 | 8 |
| attendance-lunch-return.cy.ts | 00:31 | 2 |
| attendance-lunch-start.cy.ts | 00:26 | 2 |
| employees.cy.ts | 00:39 | 3 |
| home.cy.ts | 00:04 | 2 |
| login.cy.ts | 01:30 | 18 |
| **Total** | **04:06** | **35** |
| **Wall-clock** | **04:42** | — |

---

## Technical Tasks

### Phase 1 — Documentation
- [x] Create `doc/conventions/testing/testing-strategy.md`
- [x] Add testing strategy section to `CLAUDE.md`
- [x] Update `doc/conventions/git/pr_review_rules.md` with testing rules
- [x] Apply reviewer observations to testing-strategy.md
- [x] Add "Test Data Management" section

### Phase 2 — Refactor login.cy.ts
- [x] Reduce to happy-path tests only (18 → 4 tests)
- [x] Create `Layout.test.tsx` — 10 Vitest tests for auth guards
- [x] Create `login.test.tsx` — 13 Vitest tests for UI, form behavior, errors
- [x] Verify all tests pass in both modes

### Phase 3 — Optimize test data setup
- [x] Create `php artisan test:reset` command (truncate + selective seed, ~2-3s)
- [x] Create `database/seeders/Testing/CoreTestSeeder` (Passport, roles, permissions, branch, units, users)
- [x] Create `database/seeders/Testing/AttendanceTestSeeder` (8 employees + 2 admin profiles, schedules)
- [x] Add `test:reset` Cypress task in `cypress.config.ts`
- [x] Update all Cypress specs to use `test:reset` instead of `db:reset`
- [x] Document seeder architecture convention (`doc/conventions/testing/test-data-seeders.md`)
- [x] Document test environment services convention (`doc/conventions/testing/test-environment-services.md`)
- [x] Update `testing-strategy.md` with seeder categories + environment services
- [x] Update `CLAUDE.md` with seeder + environment services references
- [x] Update `seeder-system.md` with Testing/ and Fakes/ namespaces
- [ ] Optimize seeders for bulk inserts (remove individual `Model::create()` loops)
- [ ] Create `Fakes/` namespace with first fake seeder (`FakeEmployeesSeeder`)
- [ ] Implement `FileTokenRecorder` to replace Mailhog dependency in `employees.cy.ts`
- [ ] Add `storage/testing/` cleanup to `test:reset` truncation step
- [ ] Update `employees.cy.ts` to use `test:getResetLink` instead of `mailhog:getResetLink`

### Bugfixes (included)
- [x] Fix `docker-compose.e2e.yml` — `target: dev` on test_e2e
- [x] Fix `docker-compose.e2e.yml` — `CYPRESS_apiUrl` for headless
- [x] Fix `login.cy.ts` — DOM detachment race condition

---

## Acceptance Criteria

- [x] Testing strategy documented and enforced in CLAUDE.md + PR review rules
- [x] `login.cy.ts` ≤ 5 Cypress tests (happy path only) → 4 tests
- [x] Login validation/error/guard coverage in Vitest → 23 tests
- [x] `make cypress-run` time reduced vs baseline → 04:06 → 03:17 (-20%)
- [x] All Cypress tests pass headed and headless

---

## Performance Results (after Phase 2)

| Spec | Before | After | Δ |
|---|---|---|---|
| attendance-checkin.cy.ts | 00:55 (8) | 00:51 (8) | -4s |
| attendance-lunch-return.cy.ts | 00:31 (2) | 00:31 (2) | = |
| attendance-lunch-start.cy.ts | 00:26 (2) | 00:25 (2) | -1s |
| employees.cy.ts | 00:39 (3) | 00:42 (3) | +3s |
| home.cy.ts | 00:04 (2) | 00:05 (2) | +1s |
| login.cy.ts | **01:30 (18)** | **00:42 (4)** | **-48s** |
| **Total test time** | **04:06 (35)** | **03:17 (21)** | **-49s (-20%)** |
| **Wall-clock** | **04:42** | **03:52** | **-50s (-18%)** |

**Vitest:** 1100 → 1123 tests (+23 new, covering migrated login tests)

---

## Performance Results (Phase 3 — test:reset)

| Command | Duration | Notes |
|---|---|---|
| `migrate:fresh --seed` (before) | ~30s | Full schema rebuild + all seeders |
| `test:reset` (core only) | ~2.0s | Truncate + CoreTestSeeder |
| `test:reset --seeders=attendance` | ~2.6s | Truncate + Core + AttendanceTestSeeder |

**Data seeded by `test:reset --seeders=attendance`:**
- 11 users (3 core + 8 employees)
- 10 employees (EMP-001..EMP-008 + ADM-001, ADM-002)
- 10 employment periods, 10 schedules, 70 schedule days
- 8 roles, 39 permissions, 1 branch, 3 operating units, 2 Passport clients

**Expected Cypress improvement:** Each spec's `before()` hook drops from ~30s to ~3s → ~27s saved × 5 specs using db:reset = **~135s total saved per run**.
