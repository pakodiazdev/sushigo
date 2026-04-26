/**
 * Negotiated Extra Days — E2E happy path (Task #060 + cancel)
 *
 * Tests the executive summary and history dialog in the Employee Detail panel.
 * Verifies:
 *  1. Executive summary shows upcoming badge for future records.
 *  2. "Ver historial" opens the dialog with all 4 seeded records.
 *  3. Date-range filter in the dialog works (hides past records).
 *  4. Cancel button (future day) removes the row and updates the summary.
 *  5. Cancel button is disabled for past days in the history dialog.
 *
 * Seeder: NegotiatedExtraDaysSeeder seeds 4 records for EMP-001:
 *   2026-03-15  $600  prima 100%  "Turno especial"   (past)
 *   2026-04-05  $500  prima 50%   (sin notas)         (past)
 *   2026-04-20  $700  prima 0%    "Sin prima"         (past)
 *   2026-05-10  $800  prima 100%  "Próximo extra"     (future — cancellable)
 *
 * DB reset strategy
 * ─────────────────
 * • before()      → cy.task('test:reset', 'attendance-extra-days') ONCE per file.
 * • Cancel suite  → resets before each test (cancel mutates state).
 *
 * To run only this file:
 *   make cypress-spec SPEC=employee-negotiated-extra-days
 */

import users from '../fixtures/users.json'

const { email, password } = users.admin

// ── Shared helpers ────────────────────────────────────────────────────────────

function openEmp001Detail() {
  cy.contains('tr', 'EMP-001', { timeout: 10_000 })
    .find('button[title="Ver detalle"]')
    .click()
  cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')
}

function scrollToExtraDays() {
  cy.contains('Días extra', { timeout: 10_000 }).scrollIntoView().should('be.visible')
}

function openHistory() {
  cy.contains('button', 'Ver historial').click()
  cy.contains('Historial de días extra', { timeout: 8_000 }).should('be.visible')
}

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance-extra-days', { timeout: 60_000 })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suite 1 — Executive summary
// ══════════════════════════════════════════════════════════════════════════════

describe('Negotiated Extra Days — Executive Summary', () => {
  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    cy.closeDevDebugger()
  })

  it('shows upcoming badge for the future seeded record', () => {
    cy.intercept('GET', '**/negotiated-extra-days**').as('listUpcoming')

    openEmp001Detail()
    scrollToExtraDays()
    cy.wait('@listUpcoming')

    // The future record (2026-05-10) appears in the upcoming badge
    cy.contains('1 programado').should('be.visible')

    // Upcoming list row is shown
    cy.contains('Próximo extra', { timeout: 8_000 }).should('be.visible')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suite 2 — History dialog: list + filter
// ══════════════════════════════════════════════════════════════════════════════

describe('Negotiated Extra Days — History Dialog', () => {
  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    cy.closeDevDebugger()
  })

  it('shows all 4 seeded records in the history table', () => {
    cy.intercept('GET', '**/negotiated-extra-days**').as('listExtraDays')

    openEmp001Detail()
    scrollToExtraDays()
    openHistory()

    cy.wait('@listExtraDays').its('response.statusCode').should('eq', 200)

    // Table headers
    cy.contains('th', 'Fecha').should('be.visible')
    cy.contains('th', 'Salario').should('be.visible')
    cy.contains('th', 'Prima %').should('be.visible')

    // All 4 records
    cy.contains('Turno especial').should('be.visible')
    cy.contains('Sin prima').should('be.visible')
    cy.contains('Próximo extra').should('be.visible')

    // Wage amounts present
    cy.contains('td', /600/).should('exist')
    cy.contains('td', /800/).should('exist')
  })

  it('filters records by date_from and clears the filter', () => {
    cy.intercept('GET', '**/negotiated-extra-days**').as('listExtraDays')

    openEmp001Detail()
    scrollToExtraDays()
    openHistory()
    cy.wait('@listExtraDays')

    // Apply date_from filter (2026-05-01)
    cy.intercept('GET', '**/negotiated-extra-days**').as('listFiltered')
    cy.get('#history-date-from').clear().type('2026-05-01')
    cy.wait('@listFiltered').its('response.statusCode').should('eq', 200)

    cy.contains('Turno especial').should('not.exist')
    cy.contains('Sin prima').should('not.exist')
    cy.contains('Próximo extra').should('be.visible')

    // Clear filter — all records return
    cy.intercept('GET', '**/negotiated-extra-days**').as('listCleared')
    cy.contains('button', 'Limpiar').click()
    cy.wait('@listCleared').its('response.statusCode').should('eq', 200)

    cy.contains('Turno especial').should('be.visible')
    cy.contains('Próximo extra').should('be.visible')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Suite 3 — Cancel extra day
// ══════════════════════════════════════════════════════════════════════════════

describe('Negotiated Extra Days — Cancel', () => {
  beforeEach(() => {
    cy.task('test:reset', 'attendance-extra-days', { timeout: 60_000 })
    cy.loginByApi(email, password)
    cy.visitWithAuth('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    cy.closeDevDebugger()
  })

  it('cancels the future extra day from the upcoming list', () => {
    cy.intercept('DELETE', '**/negotiated-extra-days/**').as('cancelDay')

    openEmp001Detail()
    scrollToExtraDays()

    // Upcoming row for "Próximo extra" is visible
    cy.contains('Próximo extra', { timeout: 8_000 }).should('be.visible')

    // Click the XCircle cancel button on that row
    cy.contains('Próximo extra')
      .closest('div')
      .find('button[aria-label="Cancelar día extra"]')
      .click()

    cy.wait('@cancelDay').its('response.statusCode').should('eq', 200)

    // Row and badge disappear after cancellation
    cy.contains('Próximo extra').should('not.exist')
    cy.contains('1 programado').should('not.exist')
  })

  it('shows cancel button disabled for past days in the history dialog', () => {
    cy.intercept('GET', '**/negotiated-extra-days**').as('listExtraDays')

    openEmp001Detail()
    scrollToExtraDays()
    openHistory()
    cy.wait('@listExtraDays')

    // Past record row → cancel button is disabled
    cy.contains('tr', 'Turno especial')
      .find('button[aria-label="Cancelar día extra"]')
      .should('be.disabled')

    // Future record row → cancel button is enabled
    cy.contains('tr', 'Próximo extra')
      .find('button[aria-label="Cancelar día extra"]')
      .should('not.be.disabled')
  })
})
