/**
 * Vacation Entitlement — E2E happy path (Task #081)
 *
 * Verifies that an Admin can:
 *  1. Open EMP-001's employee detail panel from the /employees page
 *  2. See the "Vacaciones" section with the "LFT México 2022" badge
 *  3. Click "Registrar derecho", select year 2026, and submit
 *  4. The table shows the newly registered entitlement with auto-calculated days
 *  5. Registering the same year again shows a duplicate error
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'core') ONCE per file.
 *   EMP-001 (Carlos Mendoza) is seeded by CoreTestSeeder with hire year 2020
 *   → 6 years by 2026 → 22 days (LFT bracket 6–10).
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

before(() => {
  cy.task('test:reset', 'core', { timeout: 60_000 })
})

beforeEach(() => {
  cy.loginByApi(email, password)
  cy.visitWithAuth('/employees')
  cy.closeDevDebugger()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

it('shows the Vacaciones section with the LFT badge', () => {
  openEmp001Detail()
  scrollToVacation()

  cy.contains('h3', 'Vacaciones').should('be.visible')
  cy.contains('LFT México 2022').should('be.visible')
  cy.contains('Sin derechos vacacionales registrados').should('be.visible')
})

it('registers a vacation entitlement for 2026 and shows it in the table', () => {
  openEmp001Detail()
  scrollToVacation()

  cy.contains('button', 'Registrar derecho').click()
  cy.get('[data-testid="vacation-register-form"]').should('be.visible')

  // Select 2026
  cy.get('#vac-year').select('2026')

  cy.contains('button', 'Guardar').click()

  // Wait for the table to appear with the new row
  cy.contains('2026', { timeout: 8_000 }).should('be.visible')
  cy.contains('22').should('be.visible')   // entitled_days for 6 years of service
  cy.contains('0').should('be.visible')    // used_days
})

it('shows a duplicate error when registering the same year twice', () => {
  openEmp001Detail()
  scrollToVacation()

  // Register first time
  cy.contains('button', 'Registrar derecho').click()
  cy.get('#vac-year').select('2025')
  cy.contains('button', 'Guardar').click()
  cy.contains('2025', { timeout: 8_000 }).should('be.visible')

  // Try to register 2025 again
  cy.contains('button', 'Registrar derecho').click()
  cy.get('#vac-year').select('2025')
  cy.contains('button', 'Guardar').click()

  cy.contains('2025', { timeout: 5_000 }).should('be.visible') // error message contains year
})
