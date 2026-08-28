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
 * Seeder: NegotiatedExtraDaysSeeder seeds 4 records for EMP-001 using
 * relative dates so the "future" record stays future regardless of when the
 * test runs:
 *   today - 90 days  $600  prima 100%  "Turno especial"   (past)
 *   today - 69 days  $500  prima 50%   (sin notas)         (past)
 *   today - 54 days  $700  prima 0%    "Sin prima"         (past)
 *   today + 30 days  $800  prima 100%  "Próximo extra"     (future — cancellable)
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
  // Scope to the Días extra section header — the leave-summary-section also
  // has a "Ver historial" button and cy.contains would click the wrong one.
  cy.contains('h3', 'Días extra')
    .parent()
    .contains('button', 'Ver historial')
    .click()
  cy.contains('Historial de días extra', { timeout: 8_000 }).should('be.visible')
}

// ── Suite setup ──────────────────────────────────────────────────────────────

// ⚠️ QUARANTINED per #490 → see #558 (CI-only failure; passes locally). Fails against a fresh stack:
// CI-only (passes locally on Electron): 1 of 5 tests fails — an <h3.flex.items-center.gap-2.text-sm.font-semibold> section heading is "not visible" after 15s — same overlay/scroll signature as #553.
// Remove this guard when #558 is fixed.
before(function () {
  this.skip()
})

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
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('shows upcoming badge for the future seeded record', () => {
    cy.intercept('GET', '**/negotiated-extra-days**').as('listUpcoming')

    openEmp001Detail()
    scrollToExtraDays()
    cy.wait('@listUpcoming')

    // The future record appears in the upcoming badge
    cy.contains('1 programado').should('be.visible')

    // The upcoming list section header appears (notes are not shown in the
    // upcoming card — only date, wage and prima %).
    cy.contains('Próximos días extra', { timeout: 8_000 }).should('be.visible')
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
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('shows all 4 seeded records in the history table', () => {
    cy.intercept('GET', '**/negotiated-extra-days**').as('listExtraDays')

    openEmp001Detail()
    scrollToExtraDays()
    openHistory()

    cy.wait('@listExtraDays').its('response.statusCode').should('eq', 200)

    // Table headers — scoped to dialog[open] to avoid matching the employee
    // table's "Fecha Creacion" th which has hidden lg:table-cell classes.
    cy.get('dialog[open]').within(() => {
      cy.contains('th', 'Fecha').should('be.visible')
      cy.contains('th', 'Salario').should('be.visible')
      cy.contains('th', 'Prima %').should('be.visible')
    })

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

    // Apply date_from filter set to today-30 days: always hides the 3 past
    // records (seeded at today-90, today-69, today-54 days) while leaving the
    // future record (today+30 days) visible. A hardcoded date would break once
    // today-54 days overtakes it.
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const filterDate = thirtyDaysAgo.toISOString().slice(0, 10)

    cy.intercept('GET', '**/negotiated-extra-days**').as('listFiltered')
    cy.get('#history-date-from').clear().type(filterDate)
    cy.wait('@listFiltered').its('response.statusCode').should('eq', 200)

    cy.contains('Turno especial').should('not.exist')
    cy.contains('Sin prima').should('not.exist')
    cy.contains('Próximo extra').should('be.visible')

    // Clear filter — all records return.
    // Scope to dialog[open] to avoid matching a "Limpiar" button elsewhere.
    // React Query may serve the unfiltered result from cache (no new HTTP
    // request), so verify UI state directly instead of waiting for a network call.
    cy.get('dialog[open]').contains('button', 'Limpiar').click()
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
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('cancels the future extra day from the upcoming list', () => {
    cy.intercept('DELETE', '**/negotiated-extra-days/**').as('cancelDay')

    openEmp001Detail()
    scrollToExtraDays()

    // Upcoming section appears when there is at least one future record.
    // Notes ("Próximo extra") are not shown in the upcoming card — only date,
    // wage and prima %. Use the section header to verify the row is present.
    cy.contains('Próximos días extra', { timeout: 8_000 }).should('be.visible')

    // Click the cancel button on the upcoming row (only one record scheduled).
    cy.get('[aria-label="Cancelar día extra"]').click()

    // Clicking the button opens a ConfirmDialog — confirm the cancellation.
    cy.contains('button', 'Sí, cancelar').click()

    cy.wait('@cancelDay').its('response.statusCode').should('eq', 200)

    // Section and badge disappear (no more upcoming records).
    cy.contains('Próximos días extra').should('not.exist')
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
