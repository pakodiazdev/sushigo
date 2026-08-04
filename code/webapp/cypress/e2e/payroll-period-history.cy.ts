/**
 * Payroll Period History — E2E test
 *
 * Covers the happy path for browsing pay period history (#075):
 *   1. Admin navigates to /attendance/payroll (periods list)
 *   2. Verifies several weeks of CLOSED history are listed (most recent first)
 *   3. Filters by a date range and verifies only the matching weeks remain
 *   4. Opens a historical (non-hardcoded) week's detail and verifies it renders
 *
 * Pre-seeded data (via test:reset --seeders=payroll-closed-period):
 *   - CoreTestSeeder: branch MAIN, admin user (admin@sushigo.com / admin123456)
 *   - PayrollPreviewSeeder: PAY-001 Ana Payroll & PAY-002 Carlos Nomina
 *   - PayrollClosedPeriodSeeder: CLOSED PayPeriod 2026-06-22..2026-06-28
 *   - PayrollPeriodHistorySeeder: 8 more CLOSED weeks, 2026-04-27..2026-06-21
 *
 * To run only this spec:
 *   make cypress-spec SPEC=payroll-period-history
 */

const LATEST_WEEK = '2026-06-22 — 2026-06-28'

describe('Payroll Period History — happy path', () => {
  beforeEach(() => {
    cy.task('test:reset', 'payroll-closed-period')
    cy.loginByApi('admin@sushigo.com', 'admin123456')
  })

  it('lists the backfilled weekly history with the most recent period first', () => {
    cy.intercept('GET', '**/pay-periods?*').as('list')
    cy.visitWithAuth('/attendance/payroll')
    cy.wait('@list')
    cy.closeDevDebugger()

    cy.get('table tbody tr').should('have.length', 9)
    cy.get('table tbody tr').first().contains(LATEST_WEEK)
  })

  it('filters the history down to a date range', () => {
    cy.intercept('GET', '**/pay-periods?*').as('list')
    cy.visitWithAuth('/attendance/payroll')
    cy.wait('@list')
    cy.closeDevDebugger()

    cy.intercept('GET', '**/pay-periods?*').as('filtered')
    cy.get('input#pay-period-start').clear({ force: true }).type('2026-05-04', { force: true })
    cy.get('input#pay-period-end').clear({ force: true }).type('2026-05-17', { force: true })
    cy.wait('@filtered')

    cy.get('table tbody tr').should('have.length', 2)
    cy.contains('table tbody tr', '2026-05-04 — 2026-05-10').should('be.visible')
    cy.contains('table tbody tr', '2026-05-11 — 2026-05-17').should('be.visible')
  })

  it('opens a backfilled historical week and shows its frozen breakdown', () => {
    const periodLabel = '2026-06-08 — 2026-06-14'

    cy.intercept('GET', '**/pay-periods?*').as('list')
    cy.intercept('GET', '**/pay-periods/*').as('detail')

    cy.visitWithAuth('/attendance/payroll')
    cy.wait('@list')
    cy.closeDevDebugger()

    cy.contains('table tbody tr', periodLabel)
      .contains('a', periodLabel)
      .click()
    cy.wait('@detail')

    cy.get('[data-testid="pay-period-summary"]').contains('Cerrado').should('be.visible')
    cy.get('[data-testid="employee-detail-row"]').should('have.length', 2)
    cy.get('[data-testid="employee-detail-row"]').first().contains('Total: $4000.00').should('be.visible')
  })
})
