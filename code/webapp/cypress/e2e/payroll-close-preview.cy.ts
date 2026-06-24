/**
 * Payroll Close Preview — E2E tests
 *
 * Covers the happy path for the weekly payroll preview:
 *   1. Manager navigates to /attendance/payroll/close
 *   2. Selects the week 2026-06-22..2026-06-28
 *   3. Clicks "Calcular preview"
 *   4. Verifies the table renders with 2 employee rows (PAY-001, PAY-002)
 *   5. Expands one row and verifies BASE_PAY lines are present
 *
 * Pre-seeded data (via test:reset --seeders=payroll-preview):
 *   - CoreTestSeeder: branch MAIN, admin user (admin@sushigo.com / admin123456)
 *   - PayrollPreviewSeeder: PAY-001 Ana Payroll & PAY-002 Carlos Nomina
 *     Each employee: Mon–Fri WORKED 08:00–17:00, hourly_rate=100, weekly_scheduled_hours=48
 *
 * Expected base_pay per employee:
 *   5 days × 8h × $100/h = $4,000
 *
 * To run only this spec:
 *   make cypress-spec SPEC=payroll-close-preview
 */

const PERIOD_START = '2026-06-22'
const PERIOD_END = '2026-06-28'

describe('Payroll Close Preview — happy path', () => {
  before(() => {
    cy.task('test:reset', 'payroll-preview')
  })

  beforeEach(() => {
    cy.loginByApi('admin@sushigo.com', 'admin123456')
    cy.visitWithAuth('/attendance/payroll/close')
  })

  it('renders the page and date inputs', () => {
    cy.contains('h1, h2', 'Cierre de Nómina').should('be.visible')
    cy.get('[data-testid="payroll-preview-form"] input[type="date"]').should('have.length', 2)
    cy.contains('button', 'Calcular preview').should('be.visible')
  })

  it('shows employee rows after clicking Calcular preview', () => {
    cy.intercept('GET', '**/pay-periods/preview**').as('preview')

    cy.get('input[type="date"]').first().clear().type(PERIOD_START)
    cy.get('input[type="date"]').last().clear().type(PERIOD_END)
    cy.contains('button', 'Calcular preview').click()

    cy.wait('@preview')

    cy.contains('Payroll').should('be.visible')
    cy.contains('Nomina').should('be.visible')

    // Two employee rows
    cy.get('[data-testid="employee-preview-row"]').should('have.length.gte', 2)
  })

  it('expands a row and shows BASE_PAY lines', () => {
    cy.intercept('GET', '**/pay-periods/preview**').as('preview')

    cy.get('input[type="date"]').first().clear().type(PERIOD_START)
    cy.get('input[type="date"]').last().clear().type(PERIOD_END)
    cy.contains('button', 'Calcular preview').click()

    cy.wait('@preview')

    // Expand first employee row
    cy.get('[data-testid="employee-preview-row"]').first().click()
    cy.contains('BASE_PAY').should('be.visible')
  })
})
