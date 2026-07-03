/**
 * Payroll Close Confirm — E2E tests
 *
 * Covers the happy path for confirming a weekly payroll close:
 *   1. Manager navigates to /attendance/payroll/close
 *   2. Selects the week 2026-06-22..2026-06-28 and calculates the preview
 *   3. Clicks "Confirmar cierre"
 *   4. Confirms in the dialog
 *   5. Verifies success toast and redirect to /attendance
 *   6. Verifies re-confirming the same period is rejected as a duplicate
 *
 * Pre-seeded data (via test:reset --seeders=payroll-preview):
 *   - CoreTestSeeder: branch MAIN, admin user (admin@sushigo.com / admin123456)
 *   - PayrollPreviewSeeder: PAY-001 Ana Payroll & PAY-002 Carlos Nomina
 *     Each employee: Mon–Fri WORKED 08:00–17:00, hourly_rate=100, weekly_scheduled_hours=48
 *
 * To run only this spec:
 *   make cypress-spec SPEC=payroll-close-confirm
 */

const PERIOD_START = '2026-06-22'
const PERIOD_END = '2026-06-28'

describe('Payroll Close Confirm — happy path', () => {
  beforeEach(() => {
    cy.task('test:reset', 'payroll-preview')
    cy.loginByApi('admin@sushigo.com', 'admin123456')
    cy.visitWithAuth('/attendance/payroll/close')

    cy.intercept('GET', '**/pay-periods/preview**').as('preview')
    cy.setDateInput('#period-start', PERIOD_START)
    cy.setDateInput('#period-end', PERIOD_END)
    cy.contains('button', 'Calcular preview').click()
    cy.wait('@preview')
  })

  it('confirms the close and redirects to the attendance index', () => {
    cy.intercept('POST', '**/pay-periods').as('confirmClose')

    cy.contains('button', 'Confirmar cierre').click({ force: true })
    cy.get('[role="alertdialog"]').should('be.visible')
    cy.contains('[role="alertdialog"]', PERIOD_START).should('be.visible')
    cy.contains('[role="alertdialog"]', PERIOD_END).should('be.visible')

    cy.contains('[role="alertdialog"] button', 'Confirmar y cerrar').click()
    cy.wait('@confirmClose').its('response.statusCode').should('eq', 201)

    cy.contains('cierre').should('be.visible')
    cy.location('pathname').should('eq', '/attendance')
  })

  it('rejects confirming the same period twice with a friendly error', () => {
    cy.intercept('POST', '**/pay-periods').as('confirmClose')

    cy.contains('button', 'Confirmar cierre').click({ force: true })
    cy.contains('[role="alertdialog"] button', 'Confirmar y cerrar').click()
    cy.wait('@confirmClose').its('response.statusCode').should('eq', 201)

    cy.location('pathname').should('eq', '/attendance')
    cy.visitWithAuth('/attendance/payroll/close')

    cy.intercept('GET', '**/pay-periods/preview**').as('secondPreview')
    cy.setDateInput('#period-start', PERIOD_START)
    cy.setDateInput('#period-end', PERIOD_END)
    cy.contains('button', 'Calcular preview').click()
    cy.wait('@secondPreview')

    cy.intercept('POST', '**/pay-periods').as('confirmCloseAgain')
    cy.contains('button', 'Confirmar cierre').click({ force: true })
    cy.contains('[role="alertdialog"] button', 'Confirmar y cerrar').click()
    cy.wait('@confirmCloseAgain').its('response.statusCode').should('eq', 422)

    cy.contains('Ya existe un cierre para este periodo').should('be.visible')
    cy.location('pathname').should('eq', '/attendance/payroll/close')
  })
})
