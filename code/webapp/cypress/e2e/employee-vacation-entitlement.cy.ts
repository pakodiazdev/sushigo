/**
 * Vacation Entitlement — E2E happy path (Task #212)
 *
 * Verifies that vacation entitlements are generated automatically the first
 * time an Admin opens an employee's "Vacaciones" section — there is no
 * manual "Registrar derecho" action anymore. Entitlements are created for
 * every anniversary the employee has already reached, using the active LFT
 * rule (VacationsLFTMX).
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'attendance') ONCE per file.
 *   AttendanceTestSeeder hires every employee exactly 1 year before "now",
 *   so EMP-001 has completed exactly 1 seniority year → viewing its
 *   Vacaciones section auto-generates a single 12-day entitlement (LFT year 1).
 *
 * To run only this file:
 *   make cypress-spec SPEC=employee-vacation-entitlement
 */

import users from '../fixtures/users.json'

const { email, password } = users.admin

// ── Helpers ───────────────────────────────────────────────────────────────────

function openEmp001Detail() {
  cy.contains('tr', 'EMP-001', { timeout: 10_000 })
    .find('button[title="Ver detalle"]')
    .click()
  cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')
}

function scrollToVacation() {
  cy.contains('h3', 'Vacaciones', { timeout: 10_000 }).scrollIntoView().should('be.visible')
}

// ── Suite setup ───────────────────────────────────────────────────────────────

// ⚠️ QUARANTINED per #490 → see #541. Fails against a fresh stack:
// Happy-path test fails: entitlement <p> is `position: fixed` and "covered by" the blue DevDebugger bar (`<div class="bg-blue-600 ...">`).
// Remove this guard when #541 is fixed.
before(function () {
  this.skip()
})

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

beforeEach(() => {
  cy.loginByApi(email, password)
  cy.visitWithAuth('/employees')
  cy.closeDevDebugger()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

it('auto-generates the reached anniversary entitlement when Vacaciones is opened', () => {
  openEmp001Detail()
  scrollToVacation()

  cy.contains('h3', 'Vacaciones').should('be.visible')
  cy.contains('LFT México 2022').should('be.visible')

  // 1 completed seniority year → summary shows tenure and next anniversary date
  cy.contains('1 año de antigüedad').should('be.visible')
  cy.contains('Próximo aniversario:').should('be.visible')

  // 1 completed seniority year → 12 days (LFT year 1), generated automatically
  cy.contains('12').should('be.visible')
  cy.contains('Regla aplicada: LFT México 2022').should('be.visible')
})
