/**
 * Closed Period Detail — E2E tests
 *
 * Covers the happy path for viewing a closed payroll period:
 *   1. Manager navigates to /attendance/payroll (list)
 *   2. Verifies the CLOSED period for week 2026-06-22..2026-06-28 is listed
 *   3. Clicks into the period detail
 *   4. Verifies the frozen breakdown renders (status badge, employee rows, totals)
 *   5. Expands a row and verifies the BASE_PAY line is present
 *
 * Pre-seeded data (via test:reset --seeders=payroll-closed-period):
 *   - CoreTestSeeder: branch MAIN, admin user (admin@sushigo.com / admin123456)
 *   - PayrollPreviewSeeder: PAY-001 Ana Payroll & PAY-002 Carlos Nomina
 *   - PayrollClosedPeriodSeeder: freezes a CLOSED PayPeriod for 2026-06-22..2026-06-28
 *     with base_pay=4000/total_pay=4000 per employee and one BASE_PAY line each
 *
 * To run only this spec:
 *   make cypress-spec SPEC=closed-period-detail
 */

const PERIOD_START = '2026-06-22'
const PERIOD_END = '2026-06-28'

describe('Closed Period Detail — happy path', () => {
  before(() => {
    cy.task('test:reset', 'payroll-closed-period')
  })

  beforeEach(() => {
    cy.loginByApi('admin@sushigo.com', 'admin123456')
  })

  it('lists the closed period and navigates into its detail', () => {
    cy.intercept('GET', '**/pay-periods?*').as('list')
    cy.visitWithAuth('/attendance/payroll')
    cy.wait('@list')

    cy.get('[data-testid="pay-period-row"]').should('have.length.gte', 1)
    cy.contains('[data-testid="pay-period-row"]', `${PERIOD_START} — ${PERIOD_END}`).within(() => {
      cy.contains('Cerrado').should('be.visible')
      cy.contains(`${PERIOD_START} — ${PERIOD_END}`).click()
    })

    cy.location('pathname').should('match', /\/attendance\/payroll\/.+/)
  })

  it('shows the frozen breakdown with employee rows and totals', () => {
    cy.intercept('GET', '**/pay-periods?*').as('list')
    cy.intercept('GET', '**/pay-periods/*').as('detail')

    cy.visitWithAuth('/attendance/payroll')
    cy.wait('@list')

    cy.contains('[data-testid="pay-period-row"]', `${PERIOD_START} — ${PERIOD_END}`)
      .contains(`${PERIOD_START} — ${PERIOD_END}`)
      .click()
    cy.wait('@detail')

    cy.get('[data-testid="pay-period-summary"]').contains('Cerrado').should('be.visible')
    cy.get('[data-testid="employee-detail-row"]').should('have.length', 2)
    cy.get('[data-testid="employee-detail-row"]').first().contains('Total: $4000.00').should('be.visible')
  })

  it('expands an employee row and shows the BASE_PAY line', () => {
    cy.intercept('GET', '**/pay-periods?*').as('list')
    cy.intercept('GET', '**/pay-periods/*').as('detail')

    cy.visitWithAuth('/attendance/payroll')
    cy.wait('@list')

    cy.contains('[data-testid="pay-period-row"]', `${PERIOD_START} — ${PERIOD_END}`)
      .contains(`${PERIOD_START} — ${PERIOD_END}`)
      .click()
    cy.wait('@detail')

    cy.get('[data-testid="employee-detail-row"]').first().find('button[aria-expanded]').click()
    cy.get('[data-testid="employee-detail-row"]').first().find('button[aria-expanded="true"]').should('exist')
    cy.contains('BASE_PAY').should('be.visible')
  })
})
