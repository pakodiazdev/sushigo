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
- [ ] Apply reviewer observations to testing-strategy.md
- [ ] Add "Test Data Management" section

### Phase 2 — Refactor login.cy.ts
- [ ] Reduce to happy-path tests only (~4 tests)
- [ ] Create Vitest specs for migrated tests (validation, errors, guards)
- [ ] Verify all tests pass in both modes

### Phase 3 — Optimize test data setup (future issue)
- [ ] Create `php artisan test:reset` command
- [ ] Create `database/seeders/Testing/` with fast seeders
- [ ] Update Cypress tasks for targeted seeding

### Bugfixes (included)
- [x] Fix `docker-compose.e2e.yml` — `target: dev` on test_e2e
- [x] Fix `docker-compose.e2e.yml` — `CYPRESS_apiUrl` for headless
- [x] Fix `login.cy.ts` — DOM detachment race condition

---

## Acceptance Criteria

- [ ] Testing strategy documented and enforced in CLAUDE.md + PR review rules
- [ ] `login.cy.ts` ≤ 5 Cypress tests (happy path only)
- [ ] Login validation/error/guard coverage in Vitest
- [ ] `make cypress-run` time reduced vs baseline
- [ ] All Cypress tests pass headed and headless
