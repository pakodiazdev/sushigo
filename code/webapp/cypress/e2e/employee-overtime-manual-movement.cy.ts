/**
 * Manual Overtime Bank Movement — E2E happy path (Task #071)
 *
 * Verifies that an admin can register a manual ADJUSTMENT movement from the
 * Overtime Bank section of the Employee Detail panel, and that the balance and
 * movement history refresh immediately after saving.
 *
 * Reuses OvertimeBankTestSeeder (Task #070) — EMP-001 starts with a net balance
 * of 0 min (90 EARNED - 90 PAID), so the +30 min adjustment registered here is
 * unambiguous in the assertions below.
 *
 * To run only this file:
 *   make cypress-spec SPEC=employee-overtime-manual-movement
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

function scrollToOvertimeBank() {
  cy.get('[data-testid="overtime-bank-section"]', { timeout: 10_000 })
    .scrollIntoView()
    .should('be.visible')
}

// ── Suite setup ───────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'overtime-bank', { timeout: 60_000 })
})

beforeEach(() => {
  cy.loginByApi(email, password)
  cy.visitWithAuth('/employees')
  cy.contains('tr', 'EMP-001', { timeout: 10_000 })
  cy.closeDevDebugger()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

it('registers a manual adjustment movement and refreshes balance + history', () => {
  openEmp001Detail()
  cy.closeDevDebugger()
  scrollToOvertimeBank()

  cy.get('[data-testid="overtime-bank-section"]').within(() => {
    cy.contains('Saldo actual (0 min)').should('be.visible')
    cy.contains('button', 'Movimiento manual').click()
  })

  cy.contains('h3', 'Movimiento manual', { timeout: 10_000 }).should('be.visible')

  cy.get('select[name="movement_type"]').select('ADJUSTMENT')
  cy.get('input[name="minutes"]').clear().type('30')
  cy.get('textarea[name="reason"]').type('Corrección de saldo por error de captura')
  cy.contains('button', 'Registrar movimiento').click()

  cy.contains('h3', 'Movimiento manual').should('not.exist')

  cy.get('[data-testid="overtime-bank-section"]').within(() => {
    cy.contains('Saldo actual (30 min)').should('be.visible')
    cy.contains('tr', 'Ajuste').should('be.visible').and('contain.text', 'Manual').and('contain.text', '30 min')
  })
})
