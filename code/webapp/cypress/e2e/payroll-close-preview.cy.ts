/**
 * Payroll Close Preview — E2E tests
 *
 * Covers the happy path for the weekly payroll preview:
 *   1. Manager navigates to /attendance/payroll/close
 *   2. The current week (Mon–Sun) is shown automatically — no date inputs
 *   3. The preview loads automatically on mount — no "Calcular preview" button
 *   4. Verifies the table renders with 2 employee rows (PAY-001, PAY-002)
 *   5. Expands one row and verifies BASE_PAY lines are present
 *
 * Pre-seeded data (via test:reset --seeders=payroll-preview):
 *   - CoreTestSeeder: branch MAIN, admin user (admin@sushigo.com / admin123456)
 *   - PayrollPreviewSeeder: PAY-001 Ana Payroll & PAY-002 Carlos Nomina
 *     Each employee: Mon–Fri WORKED 08:00–17:00, hourly_rate=100, weekly_scheduled_hours=48
 *     for week 2026-06-22..2026-06-28
 *
 * The page auto-calculates "the current week" from the clock, so the browser
 * and API clocks are both frozen mid-week (Wed 2026-06-24) to match the
 * seeded period — see `attendance-close-day-overtime.cy.ts` for the same
 * dual-clock pattern (X-Test-Time header + cy.clock()).
 *
 * Expected base_pay per employee:
 *   5 days × 8h × $100/h = $4,000
 *
 * To run only this spec:
 *   make cypress-spec SPEC=payroll-close-preview
 */

const TEST_TIME_ISO = '2026-06-24T12:00:00-06:00'
const TEST_TIME_UTC = new Date('2026-06-24T18:00:00Z')

function setupBeforeEach() {
  // Mock Date BEFORE visiting so the auto-calculated current week is correct on first render.
  cy.clock(TEST_TIME_UTC.getTime(), ['Date'])

  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers['X-Test-Time'] = TEST_TIME_ISO
    req.continue()
  }).as('apiWithTestTime')

  // Registered before the visit — the preview now fetches automatically on mount.
  cy.intercept('GET', '**/pay-periods/preview**').as('preview')

  cy.loginByApi('admin@sushigo.com', 'admin123456')
  cy.visitWithAuth('/attendance/payroll/close')
  cy.contains('h1, h2', 'Cierre de Nómina').should('be.visible')
  cy.closeDevDebugger()
}

describe('Payroll Close Preview — happy path', () => {
  before(() => {
    cy.task('test:reset', 'payroll-preview')
  })

  beforeEach(() => {
    setupBeforeEach()
  })

  it('renders the page with the auto-calculated current week', () => {
    cy.get('[data-testid="current-week-label"]').should('contain.text', '22 jun').and('contain.text', '28 jun 2026')
    cy.contains('button', 'Calcular preview').should('not.exist')
  })

  it('shows employee rows automatically without clicking any button', () => {
    cy.wait('@preview')

    cy.contains('Payroll').should('be.visible')
    cy.contains('Nomina').should('be.visible')

    // Two employee rows
    cy.get('[data-testid="employee-preview-row"]').should('have.length.gte', 2)
  })

  it('expands a row and shows BASE_PAY lines', () => {
    cy.wait('@preview')

    // Click the toggle button explicitly — clicking the outer div is not reliable
    cy.get('[data-testid="employee-preview-row"]').first().find('button[aria-expanded]').click()
    cy.get('[data-testid="employee-preview-row"]').first().find('button[aria-expanded="true"]').should('exist')
    cy.contains('BASE_PAY').should('be.visible')
  })
})
