/**
 * Negotiated Extra Days List — E2E happy path (Task #060)
 *
 * Tests the negotiated extra days table in the Employee Detail panel.
 * Verifies that seeded records appear, the date-range filter works,
 * and clearing the filter restores all records.
 *
 * Seeder: NegotiatedExtraDaysSeeder seeds 3 records for EMP-001:
 *   - 2026-03-15  $600  prima 100%  "Turno especial"
 *   - 2026-04-05  $500  prima 50%   (sin notas)
 *   - 2026-04-20  $700  prima 0%    "Sin prima"
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance-extra-days') ONCE per file.
 * • beforeEach() → login + navigate to employee list.
 *
 * To run only this file:
 *   make cypress-spec SPEC=employee-negotiated-extra-days
 *   make cypress-debug SPEC=employee-negotiated-extra-days
 */

import users from '../fixtures/users.json'

const { email, password } = users.admin

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance-extra-days', { timeout: 60_000 })
})

// ══════════════════════════════════════════════════════════════════════════════
// Happy Path — view extra days list with date range filter
// ══════════════════════════════════════════════════════════════════════════════

describe('Negotiated Extra Days List — Happy Path', () => {
  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    cy.closeDevDebugger()
  })

  it('shows all 3 seeded extra days in the table', () => {
    cy.intercept('GET', '**/negotiated-extra-days**').as('listExtraDays')

    // ── 1. Open EMP-001 detail ────────────────────────────────────────────────
    cy.contains('tr', 'EMP-001', { timeout: 10_000 })
      .find('button[title="Ver detalle"]')
      .click()

    cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')

    // ── 2. Scroll to section ──────────────────────────────────────────────────
    cy.contains('Días extra negociados', { timeout: 10_000 }).scrollIntoView().should('be.visible')

    // ── 3. Wait for the API call and verify table headers ─────────────────────
    cy.wait('@listExtraDays').its('response.statusCode').should('eq', 200)

    cy.contains('th', 'Fecha').should('be.visible')
    cy.contains('th', 'Salario acordado').should('be.visible')
    cy.contains('th', 'Prima %').should('be.visible')
    cy.contains('th', 'Aprobado por').should('be.visible')

    // ── 4. Verify the 3 seeded records appear ─────────────────────────────────
    // Records are sorted by date desc: 2026-04-20, 2026-04-05, 2026-03-15
    cy.contains('Turno especial').should('be.visible')
    cy.contains('Sin prima').should('be.visible')

    // Check agreed wage values are rendered
    cy.contains('td', /600/).should('exist')
    cy.contains('td', /500/).should('exist')
    cy.contains('td', /700/).should('exist')

    // Check approved by column shows the admin user name
    cy.contains('td', 'Admin User').should('exist')
  })

  it('filters records by date_from and clears the filter', () => {
    cy.intercept('GET', '**/negotiated-extra-days**').as('listExtraDays')

    // ── 1. Open EMP-001 detail ────────────────────────────────────────────────
    cy.contains('tr', 'EMP-001', { timeout: 10_000 })
      .find('button[title="Ver detalle"]')
      .click()

    cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')
    cy.contains('Días extra negociados', { timeout: 10_000 }).scrollIntoView().should('be.visible')
    cy.wait('@listExtraDays')

    // Verify all 3 records initially visible
    cy.contains('Turno especial').should('be.visible')
    cy.contains('Sin prima').should('be.visible')

    // ── 2. Apply date_from filter (2026-04-01) ────────────────────────────────
    cy.intercept('GET', '**/negotiated-extra-days**').as('listFiltered')

    cy.get('#extra-day-date-from').clear().type('2026-04-01')

    cy.wait('@listFiltered').its('response.statusCode').should('eq', 200)

    // The March record should no longer be visible ("Turno especial" had notes)
    cy.contains('Turno especial').should('not.exist')

    // April records remain
    cy.contains('td', /700/).should('exist')
    cy.contains('td', /500/).should('exist')

    // ── 3. Clear the filter ───────────────────────────────────────────────────
    cy.intercept('GET', '**/negotiated-extra-days**').as('listCleared')

    cy.contains('button', 'Limpiar').click()

    cy.wait('@listCleared').its('response.statusCode').should('eq', 200)

    // All 3 records visible again
    cy.contains('Turno especial').should('be.visible')
    cy.contains('Sin prima').should('be.visible')
  })
})
