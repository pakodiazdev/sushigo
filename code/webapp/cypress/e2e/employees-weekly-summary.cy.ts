/**
 * Employees — Weekly Summary access — E2E happy-path test
 *
 * Covers opening an employee's weekly summary directly from the Employees list
 * (issue #225), reusing the same panel already covered end-to-end for the
 * Attendance page in attendance-weekly-summary-dialog.cy.ts:
 *   - Admin sees the "Ver resumen semanal" button on an employee row
 *   - Clicking it opens the same weekly summary panel used on the Attendance page
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'weekly-summary') — reuses the same seed as
 *   the attendance weekly-summary spec (EMP-001 Carlos Mendoza).
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=employees-weekly-summary
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

before(() => {
  cy.task('test:reset', 'weekly-summary', { timeout: 60_000 })
})

beforeEach(() => {
  cy.loginByApi(adminEmail, adminPassword)
  cy.visitWithAuth('/employees')
  cy.get('table', { timeout: 10_000 }).should('exist')
  cy.closeDevDebugger()
})

it('opens the weekly summary panel from the Employees page', () => {
  cy.get('[data-testid="btn-weekly-summary"]', { timeout: 10_000 })
    .should('have.length.greaterThan', 0)
    .first()
    .click()

  cy.contains('Resumen semanal —', { timeout: 8_000 }).should('be.visible')
  cy.contains('Desglose de pago', { timeout: 10_000 }).should('be.visible')
})

it('reflects the open panel in the URL and reopens it on refresh', () => {
  cy.get('[data-testid="btn-weekly-summary"]', { timeout: 10_000 }).first().click()
  cy.contains('Resumen semanal —', { timeout: 8_000 }).should('be.visible')

  cy.url().should('include', 'weeklySummary=')

  cy.reload()
  cy.get('table', { timeout: 10_000 }).should('exist')
  cy.contains('Resumen semanal —', { timeout: 8_000 }).should('be.visible')
})
