/**
 * Weekly Summary Dialog — E2E happy-path tests
 *
 * Covers the weekly summary slide panel launched from the attendance today page:
 *   - Admin sees the BarChart3 button on each employee card (has reports.weekly-summary)
 *   - Clicking the button opens the slide panel with the employee name in the title
 *   - The week label defaults to the current week (Monday–Sunday)
 *   - The payroll breakdown and daily evidence table load correctly
 *   - Clicking the week label shows/hides the calendar
 *   - Navigating to the previous/next week re-fetches and updates the results
 *   - Picking a week from the calendar re-fetches and updates the results
 *   - The "current week" shortcut appears after navigating away and restores it
 *   - Closing the panel hides it
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'weekly-summary') — reuses the same seed as
 *   the standalone weekly summary spec (EMP-001 Carlos Mendoza, week 2026-06-16 → 2026-06-22).
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-weekly-summary-dialog
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin
const TEST_TIME_ISO = '2026-06-17T14:30:00-06:00'

before(() => {
  cy.task('test:reset', 'weekly-summary', { timeout: 60_000 })
})

beforeEach(() => {
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers['X-Test-Time'] = TEST_TIME_ISO
    req.continue()
  }).as('apiWithTestTime')

  cy.loginByApi(adminEmail, adminPassword)
  cy.visitWithAuth('/attendance')
  cy.contains('Asistencia', { timeout: 10_000 }).should('be.visible')
  cy.closeDevDebugger()
})

it('shows weekly summary button on each employee card', () => {
  cy.get('[data-testid="btn-weekly-summary"]', { timeout: 10_000 })
    .should('have.length.greaterThan', 0)
})

it('opens the slide panel with the employee name when clicking the button', () => {
  cy.get('[data-testid="btn-weekly-summary"]').first().click()

  // Panel title contains "Resumen semanal —"
  cy.contains('Resumen semanal —', { timeout: 8_000 }).should('be.visible')

  // Week label is pre-filled with the current week (Monday–Sunday)
  cy.get('[data-testid="dialog-week-label"]')
    .should('contain', '16')
    .and('contain', '22')

  // No "current week" shortcut when already viewing the current week
  cy.get('[data-testid="dialog-current-week"]').should('not.exist')
})

it('loads payroll breakdown and daily evidence for EMP-001', () => {
  // Open the panel for the first employee (EMP-001 Carlos Mendoza in test seed)
  cy.get('[data-testid="btn-weekly-summary"]').first().click()

  cy.contains('Desglose de pago', { timeout: 10_000 }).should('be.visible')
  cy.contains('Sueldo base (c/descanso)').should('be.visible')
  cy.contains('Total a pagar').should('be.visible')

  cy.contains('Evidencia diaria').should('be.visible')
  cy.get('table tbody tr').should('have.length', 7)
})

it('keeps the calendar hidden by default and toggles it via the week label', () => {
  cy.get('[data-testid="btn-weekly-summary"]').first().click()
  cy.contains('Desglose de pago', { timeout: 10_000 }).should('be.visible')

  cy.get('[data-testid="week-calendar"]').should('not.exist')
  cy.get('[data-testid="dialog-week-label"]').should('have.attr', 'aria-expanded', 'false')

  cy.get('[data-testid="dialog-week-label"]').click()
  cy.get('[data-testid="week-calendar"]').should('be.visible')
  cy.get('[data-testid="dialog-week-label"]').should('have.attr', 'aria-expanded', 'true')

  cy.get('[data-testid="dialog-week-label"]').click()
  cy.get('[data-testid="week-calendar"]').should('not.exist')
  cy.get('[data-testid="dialog-week-label"]').should('have.attr', 'aria-expanded', 'false')
})

it('updates results when navigating to the previous week', () => {
  cy.get('[data-testid="btn-weekly-summary"]').first().click()
  cy.contains('Desglose de pago', { timeout: 10_000 }).should('be.visible')

  cy.get('[data-testid="dialog-prev-week"]').click()

  // Week label moves back 7 days
  cy.get('[data-testid="dialog-week-label"]')
    .should('contain', '9')
    .and('contain', '15')

  // Results reload (may show zeros — just verify table still renders)
  cy.get('table tbody tr', { timeout: 10_000 }).should('have.length', 7)
})

it('picks a different week from the calendar', () => {
  cy.get('[data-testid="btn-weekly-summary"]').first().click()
  cy.contains('Desglose de pago', { timeout: 10_000 }).should('be.visible')

  cy.get('[data-testid="dialog-week-label"]').click() // open the calendar
  cy.get('[data-testid="week-calendar"]').should('contain', 'Junio 2026')
  cy.get('[data-testid="week-calendar-row"]').first().click()

  // First week of June 2026 (2026-06-01 – 2026-06-07)
  cy.get('[data-testid="dialog-week-label"]')
    .should('contain', '1')
    .and('contain', '7')

  cy.get('table tbody tr', { timeout: 10_000 }).should('have.length', 7)
})

it('browses the calendar to a different month without moving the selected week', () => {
  cy.get('[data-testid="btn-weekly-summary"]').first().click()
  cy.contains('Desglose de pago', { timeout: 10_000 }).should('be.visible')

  cy.get('[data-testid="dialog-week-label"]').click() // open the calendar
  cy.get('[data-testid="week-calendar-next"]').click()
  cy.get('[data-testid="week-calendar"]').should('contain', 'Julio 2026')

  // Selected week (June) is unaffected until a row is actually clicked
  cy.get('[data-testid="dialog-week-label"]')
    .should('contain', '16')
    .and('contain', '22')
})

it('jumps to a different month/year via the calendar view label', () => {
  cy.get('[data-testid="btn-weekly-summary"]').first().click()
  cy.contains('Desglose de pago', { timeout: 10_000 }).should('be.visible')

  cy.get('[data-testid="dialog-week-label"]').click() // open the calendar
  // weeks -> months -> years
  cy.get('[data-testid="week-calendar-view-label"]').click()
  cy.get('[data-testid="week-calendar"]').should('contain', '2026')
  cy.get('[data-testid="week-calendar-view-label"]').click()
  cy.get('[data-testid="week-calendar-year-option"]').should('have.length.greaterThan', 0)

  cy.get('[data-testid="week-calendar-year-option"]').contains('2027').click()
  // Selecting a year moves to the months view for that year
  cy.get('[data-testid="week-calendar"]').should('contain', '2027')

  cy.get('[data-testid="week-calendar-month-option"]').contains('Ene').click()
  cy.get('[data-testid="week-calendar"]').should('contain', 'Enero 2027')
  cy.get('[data-testid="week-calendar-row"]').should('have.length.greaterThan', 0)
})

it('shows the current-week shortcut after navigating away and restores it on click', () => {
  cy.get('[data-testid="btn-weekly-summary"]').first().click()
  cy.contains('Desglose de pago', { timeout: 10_000 }).should('be.visible')

  cy.get('[data-testid="dialog-current-week"]').should('not.exist')

  cy.get('[data-testid="dialog-prev-week"]').click()
  cy.get('[data-testid="dialog-current-week"]').should('be.visible').click()

  // Back to the current week (Monday–Sunday containing the mocked test time)
  cy.get('[data-testid="dialog-week-label"]')
    .should('contain', '16')
    .and('contain', '22')
  cy.get('[data-testid="dialog-current-week"]').should('not.exist')
})

it('closes the panel when the close button is clicked', () => {
  cy.get('[data-testid="btn-weekly-summary"]').first().click()
  cy.contains('Resumen semanal —', { timeout: 8_000 }).should('be.visible')

  // SlidePanel renders a close button with aria-label or X icon
  cy.get('button[aria-label="Close"], button[aria-label="Cerrar"]').first().click()

  cy.contains('Resumen semanal —').should('not.exist')
})
