/**
 * Vacation Request — Submit & Approve flow — E2E test (Issue #082)
 *
 * Happy-path: admin opens an employee's "Vacaciones" section (which
 * auto-generates the reached entitlement), submits a vacation request for a
 * date range, then approves it — verifying the balance is deducted and the
 * request status updates to APPROVED.
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 *   AttendanceTestSeeder hires EMP-001 exactly 1 seniority year before "now",
 *   so opening its Vacaciones section auto-generates a 12-day entitlement
 *   (LFT year 1) for the current calendar year.
 * • beforeEach() → login via API + navigate to /employees.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=vacation-request-approve
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

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const today = new Date().toISOString().slice(0, 10)
// Offset well into the future to avoid colliding with today's seeded attendance,
// while staying safely within the same calendar year as the auto-generated entitlement.
const startDate = addDays(today, 30)
const endDate = addDays(today, 32)

// ── Suite setup ───────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

beforeEach(() => {
  cy.loginByApi(email, password)
  cy.visitWithAuth('/employees')
  cy.closeDevDebugger()
})

// ══════════════════════════════════════════════════════════════════════════════
// Happy path — request vacation → PENDING → approve → balance deducted
// ══════════════════════════════════════════════════════════════════════════════

describe('Vacation Request — submit & approve (happy path)', () => {
  it('creates a vacation request as PENDING, then approves it and deducts the balance', () => {
    cy.intercept('GET', '**/vacation-entitlements*').as('entitlementsLoad')
    cy.intercept('POST', '**/vacation-requests').as('createRequest')
    cy.intercept('PATCH', '**/vacation-requests/*/approve').as('approveRequest')

    // 1. Open employee detail panel and scroll to Vacaciones
    openEmp001Detail()
    cy.closeDevDebugger()
    scrollToVacation()
    cy.wait('@entitlementsLoad')

    // 2. Entitlement auto-generated: 12 days available
    cy.contains('td', '12').should('be.visible')

    // 3. Click "Solicitar vacaciones"
    cy.contains('button', 'Solicitar vacaciones').click({ force: true })
    cy.contains('h3', 'Solicitar vacaciones').should('be.visible')
    cy.contains('Solicitud — requiere aprobación').should('be.visible')

    // 4. Fill the date range (3 days) and submit
    cy.contains('label', 'Fecha de inicio').parent().find('input[type="date"]').type(startDate, { force: true })
    cy.contains('label', 'Fecha de fin').parent().find('input[type="date"]').type(endDate, { force: true })

    cy.contains('3 días solicitados').should('be.visible')

    cy.get('dialog').contains('button', 'Solicitar vacaciones').click({ force: true })

    // 5. Verify API response
    cy.wait('@createRequest').its('response.statusCode').should('eq', 201)

    // 6. PENDING request appears in the requests list
    cy.contains('Solicitudes de vacaciones').should('be.visible')
    cy.contains('td', 'Pendiente', { timeout: 10_000 }).should('be.visible')

    // 7. Approve the request
    cy.get('button[aria-label="Aprobar vacaciones"]').first().click({ force: true })
    cy.wait('@approveRequest').its('response.statusCode').should('eq', 200)

    // 8. Status updates to APPROVED and the balance is deducted (12 → 9 remaining)
    cy.contains('td', 'Aprobada', { timeout: 10_000 }).should('be.visible')
    cy.contains('td', '9').should('be.visible')
  })
})
