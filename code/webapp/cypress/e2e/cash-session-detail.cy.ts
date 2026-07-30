/**
 * Cash Session Detail — E2E tests
 *
 * Covers the happy path for viewing an open cash session's detail (#318):
 *   1. Super admin visits the dashboard and sees the open "Caja E2E" session card
 *   2. Clicks "Ver Detalles" and lands on the session detail page
 *   3. Verifies the status badge, current balance, and per-tender income/expense
 *      breakdown render correctly
 *
 * Pre-seeded data (via test:reset --seeders=cash-session-detail):
 *   - CoreTestSeeder: branch MAIN, super admin user (superadmin@sushigo.com / admin123456)
 *   - CashSessionDetailSeeder: register "Caja E2E", one DRAFT session with
 *     opening_balance=500.00, a posted INFLOW adjustment split CASH 300.00 / CARD 150.00,
 *     and a posted OUTFLOW adjustment CASH 50.00 (current balance: 900.00)
 *
 * To run only this spec:
 *   make cypress-spec SPEC=cash-session-detail
 */

const viewSessionDetail = () => {
  cy.contains('[data-testid="cash-session-card"]', 'Caja E2E').within(() => {
    cy.contains('button', 'Ver Detalles').click()
  })
}

describe('Cash Session Detail — happy path', () => {
  before(() => {
    cy.task('test:reset', 'cash-session-detail')
  })

  beforeEach(() => {
    cy.loginByApi('superadmin@sushigo.com', 'admin123456')
  })

  it('navigates from the dashboard into the session detail page', () => {
    cy.intercept('GET', '**/cash-sessions?*').as('sessions')
    cy.visitWithAuth('/')
    cy.wait('@sessions')

    viewSessionDetail()

    cy.location('pathname').should('match', /\/cash\/sessions\/.+/)
  })

  it('shows the status, current balance, and per-tender income/expense breakdown', () => {
    cy.intercept('GET', '**/cash-sessions?*').as('sessions')
    cy.intercept('GET', '**/cash-sessions/*/summary').as('summary')
    cy.intercept('GET', '**/cash-sessions/*').as('sessionDetail')

    cy.visitWithAuth('/')
    cy.wait('@sessions')

    viewSessionDetail()
    cy.wait(['@sessionDetail', '@summary'])

    cy.contains('En proceso').should('be.visible')
    cy.contains('900.00').should('be.visible')

    cy.contains('Ingresos').should('be.visible')
    cy.contains('450.00').should('be.visible')
    cy.contains('300.00').should('be.visible')
    cy.contains('150.00').should('be.visible')

    cy.contains('Egresos').should('be.visible')
    cy.contains('50.00').should('be.visible')
  })
})
