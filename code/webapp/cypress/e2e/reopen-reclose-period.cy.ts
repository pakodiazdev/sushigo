/**
 * Reopen / Reclose Pay Period — E2E tests
 *
 * Covers the happy path for reopening and reclosing a closed payroll period:
 *   1. Admin navigates to a CLOSED period's detail page
 *   2. Clicks "Reabrir periodo", enters a reason, confirms
 *   3. Verifies status badge changes to REOPENED and the reason is visible in the header
 *   4. Clicks "Volver a cerrar", confirms
 *   5. Verifies status returns to CLOSED and the reopening metadata stays visible
 *
 * Pre-seeded data (via test:reset --seeders=payroll-closed-period):
 *   - CoreTestSeeder: branch MAIN, admin user (admin@sushigo.com / admin123456)
 *   - PayrollPreviewSeeder: PAY-001 Ana Payroll & PAY-002 Carlos Nomina
 *   - PayrollClosedPeriodSeeder: freezes a CLOSED PayPeriod for 2026-06-22..2026-06-28
 *
 * To run only this spec:
 *   make cypress-spec SPEC=reopen-reclose-period
 */

const PERIOD_START = '2026-06-22'
const PERIOD_END = '2026-06-28'
const REOPEN_REASON = 'Corrección de horas extra mal capturadas'

describe('Reopen / Reclose Pay Period — happy path', () => {
  beforeEach(() => {
    cy.task('test:reset', 'payroll-closed-period')
    cy.loginByApi('admin@sushigo.com', 'admin123456')

    cy.intercept('GET', '**/pay-periods?*').as('list')
    cy.visitWithAuth('/attendance/payroll')
    cy.wait('@list')

    cy.intercept('GET', '**/pay-periods/*').as('detail')
    cy.contains('[data-testid="pay-period-row"]', `${PERIOD_START} — ${PERIOD_END}`)
      .contains(`${PERIOD_START} — ${PERIOD_END}`)
      .click()
    cy.wait('@detail')
  })

  it('reopens the period with a reason and shows the reopened status and reason in the header', () => {
    cy.get('[data-testid="pay-period-summary"]').contains('Cerrado').should('be.visible')

    cy.contains('button', 'Reabrir periodo').click({ force: true })
    cy.get('[role="alertdialog"]').should('be.visible')

    cy.contains('[role="alertdialog"] button', 'Confirmar reapertura').should('be.disabled')
    cy.get('#reopen_reason').type(REOPEN_REASON)
    cy.contains('[role="alertdialog"] button', 'Confirmar reapertura').should('not.be.disabled')

    cy.intercept('PATCH', '**/pay-periods/*/reopen').as('reopen')
    cy.contains('[role="alertdialog"] button', 'Confirmar reapertura').click()
    cy.wait('@reopen').its('response.statusCode').should('eq', 200)

    cy.get('[data-testid="pay-period-summary"]').contains('Reabierto').should('be.visible')
    cy.get('[data-testid="pay-period-summary"]').contains(REOPEN_REASON).should('be.visible')
  })

  it('recloses a reopened period and keeps the reopening metadata visible', () => {
    cy.contains('button', 'Reabrir periodo').click({ force: true })
    cy.get('#reopen_reason').type(REOPEN_REASON)

    cy.intercept('PATCH', '**/pay-periods/*/reopen').as('reopen')
    cy.contains('[role="alertdialog"] button', 'Confirmar reapertura').click()
    cy.wait('@reopen')

    cy.contains('button', 'Volver a cerrar').click({ force: true })
    cy.get('[role="alertdialog"]').should('be.visible')

    cy.intercept('PATCH', '**/pay-periods/*/reclose').as('reclose')
    cy.contains('[role="alertdialog"] button', 'Confirmar cierre').click()
    cy.wait('@reclose').its('response.statusCode').should('eq', 200)

    cy.get('[data-testid="pay-period-summary"]').contains('Cerrado').should('be.visible')
    cy.get('[data-testid="pay-period-summary"]').contains(REOPEN_REASON).should('be.visible')
  })
})
