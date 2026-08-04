/**
 * Payroll Export CSV — E2E test
 *
 * Covers the happy path for exporting a closed payroll period to CSV:
 *   1. Admin navigates to /attendance/payroll (periods list)
 *   2. Opens the closed period detail (#074) for 2026-06-22..2026-06-28
 *   3. Clicks "Exportar CSV"
 *   4. Verifies the export request succeeds and a success toast is shown
 *
 * Pre-seeded data (via test:reset --seeders=payroll-closed-period):
 *   - CoreTestSeeder: branch MAIN, admin user (admin@sushigo.com / admin123456)
 *   - PayrollPreviewSeeder: PAY-001 Ana Payroll & PAY-002 Carlos Nomina
 *   - PayrollClosedPeriodSeeder: CLOSED PayPeriod 2026-06-22..2026-06-28
 *     with a base_pay=4000 row per employee
 *
 * To run only this spec:
 *   make cypress-spec SPEC=payroll-export-csv
 */

const PERIOD_START = '2026-06-22'
const PERIOD_END = '2026-06-28'

describe('Payroll Export CSV — happy path', () => {
  beforeEach(() => {
    cy.task('test:reset', 'payroll-closed-period')
    cy.loginByApi('admin@sushigo.com', 'admin123456')
    cy.visitWithAuth('/attendance/payroll')

    cy.contains('table tbody tr', `${PERIOD_START} — ${PERIOD_END}`).should('be.visible')
    cy.closeDevDebugger()

    cy.contains('table tbody tr', `${PERIOD_START} — ${PERIOD_END}`)
      .contains('a', `${PERIOD_START} — ${PERIOD_END}`)
      .click()

    cy.location('pathname').should('match', /^\/attendance\/payroll\/.+/)
    cy.get('[data-testid="pay-period-summary"]').should('be.visible')
  })

  it('exports the closed period to CSV and shows a success toast', () => {
    cy.intercept('GET', '**/pay-periods/*/export**').as('exportCsv')

    cy.contains('button', 'Exportar CSV').click()

    cy.wait('@exportCsv').its('response.statusCode').should('eq', 200)
    cy.contains('Archivo descargado').should('be.visible')
  })
})
