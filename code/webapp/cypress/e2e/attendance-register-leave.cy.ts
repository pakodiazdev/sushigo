/**
 * Attendance — Register Direct Leave (Ausencia) — E2E tests
 *
 * Happy-path: manager registers a medical absence from the Today view.
 * The test verifies that after submission the employee card shows the
 * "Ausencia" badge instead of "Sin registro".
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 * • beforeEach() → login via API + navigate to /attendance/today.
 *
 * Employee used: EMP-009 (any seeded employee that doesn't overlap with
 * the check-in suite) — falls back to EMP-001 Mendoza, Carlos if only
 * 8 employees are seeded, since test:reset clears all attendances.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-register-leave
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

const TEST_TIME_ISO = '2026-04-09T10:00:00-06:00'
const TEST_TIME_UTC = new Date('2026-04-09T16:00:00Z')

beforeEach(() => {
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers['X-Test-Time'] = TEST_TIME_ISO
    req.continue()
  }).as('apiWithTestTime')

  cy.loginByApi(adminEmail, adminPassword)
  cy.visitWithAuth('/attendance/today')
  cy.url().should('include', '/attendance/today', { timeout: 10_000 })
  cy.closeDevDebugger()

  cy.clock(TEST_TIME_UTC.getTime(), ['Date'])
})

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Gets the employee card for the given name.
 */
function getCard(lastName: string, firstName: string) {
  return cy
    .contains('p', `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest('div.rounded-xl')
    .scrollIntoView()
}

/**
 * Opens the register-leave dialog for an employee and submits a
 * FIXED_PERCENTAGE leave (Incapacidad médica).
 */
function registerMedicalAbsence(lastName: string, firstName: string) {
  cy.intercept('GET', '**/attendances/today*').as('refetchAttendance')
  cy.intercept('GET', '**/leave-types*').as('leaveTypesLoad')
  cy.intercept('POST', '**/leaves').as('registerLeave')

  getCard(lastName, firstName)
    .contains('button', 'Registrar ausencia')
    .scrollIntoView()
    .click({ force: true })

  // Dialog should open
  cy.contains('h3', 'Registrar ausencia').should('be.visible')

  // Wait for leave types to load then pick medical
  cy.wait('@leaveTypesLoad')
  cy.get('[role="dialog"] select').first().select('Incapacidad médica')

  // Submit
  cy.contains('button', 'Registrar ausencia').last().click()

  cy.wait('@registerLeave').its('response.statusCode').should('eq', 201)
  cy.wait('@refetchAttendance', { timeout: 10_000 })
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Happy path — register medical absence
// ══════════════════════════════════════════════════════════════════════════════

describe('Register Leave — Incapacidad médica (happy path)', () => {
  it('registers a medical absence and shows the Ausencia badge on the card', () => {
    registerMedicalAbsence('Mendoza', 'Carlos')

    getCard('Mendoza', 'Carlos').within(() => {
      cy.contains('Ausencia', { timeout: 10_000 }).should('be.visible')
      cy.contains('Registrar entrada').should('not.exist')
      cy.contains('Registrar ausencia').should('not.exist')
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. Dialog cancel — no change
// ══════════════════════════════════════════════════════════════════════════════

describe('Register Leave — cancel closes dialog without changes', () => {
  it('closes the dialog when Cancel is clicked and leaves employee pending', () => {
    cy.intercept('GET', '**/leave-types*').as('leaveTypesLoad')

    getCard('García', 'María')
      .contains('button', 'Registrar ausencia')
      .click({ force: true })

    cy.contains('h3', 'Registrar ausencia').should('be.visible')
    cy.wait('@leaveTypesLoad')

    cy.contains('button', 'Cancelar').click()

    cy.contains('h3', 'Registrar ausencia').should('not.exist')

    getCard('García', 'María').within(() => {
      cy.contains('Sin registro').should('be.visible')
    })
  })
})
