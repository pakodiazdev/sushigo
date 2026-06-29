/**
 * Attendance Edit Permissions — E2E Happy Path
 *
 * Covers issue #083: Managers can only edit attendance for the current day;
 * Admins can edit any past day with a mandatory justification.
 *
 * Scenarios:
 *   1. Manager sees today's attendance with action buttons visible.
 *   2. Manager date-picker is restricted to today (min=today), cannot navigate to past dates.
 *   3. Admin date-picker has no min restriction; no lock indicator on past date.
 *   4. Admin registers a check-in on a past day — reason field is shown and required.
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 * • Each test uses the /attendance page with the date-picker.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-edit-permissions
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin
const { email: managerEmail, password: managerPassword } = users.manager

const TEST_TIME_ISO = '2026-04-02T14:30:00-06:00'
const TEST_TIME_UTC = new Date('2026-04-02T20:30:00Z')
const TODAY = '2026-04-02'
const YESTERDAY = '2026-04-01'

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

// ── Suite: Manager permissions ────────────────────────────────────────────────

describe('Manager attendance edit permissions', () => {
  beforeEach(() => {
    // Mock Date BEFORE visiting so todayDateCdmx() returns the test date on first render.
    cy.clock(TEST_TIME_UTC.getTime(), ['Date'])

    cy.intercept({ url: /\/api\/v1\// }, (req) => {
      req.headers['X-Test-Time'] = TEST_TIME_ISO
      req.continue()
    }).as('apiWithTestTime')

    // Register the intercept BEFORE visitWithAuth so the initial request is captured.
    cy.intercept('GET', '**/attendances/today**').as('loadAttendance')
    cy.loginByApi(managerEmail, managerPassword)
    cy.visitWithAuth('/attendance')
    cy.url().should('include', '/attendance', { timeout: 10_000 })
    cy.wait('@loadAttendance', { timeout: 15_000 })
    cy.closeDevDebugger()
  })

  it('shows action buttons for today (manager can edit)', () => {
    cy.get('[aria-label="Seleccionar fecha"]').should('have.value', TODAY)
    cy.contains('button', 'Registrar entrada').should('exist')
  })

  it('date-picker is restricted to today for managers (past dates are blocked)', () => {
    // Managers cannot select past dates: the min attribute is set to today.
    cy.get('[aria-label="Seleccionar fecha"]').should('have.attr', 'min', TODAY)
    cy.get('[aria-label="Seleccionar fecha"]').should('have.value', TODAY)
  })
})

// ── Suite: Admin permissions ──────────────────────────────────────────────────

describe('Admin attendance edit permissions', () => {
  beforeEach(() => {
    // Mock Date BEFORE visiting so todayDateCdmx() returns the test date on first render.
    cy.clock(TEST_TIME_UTC.getTime(), ['Date'])

    cy.intercept({ url: /\/api\/v1\// }, (req) => {
      req.headers['X-Test-Time'] = TEST_TIME_ISO
      req.continue()
    }).as('apiWithTestTime')

    // Register the intercept BEFORE visitWithAuth so the initial request is captured.
    cy.intercept('GET', '**/attendances/today**').as('loadAttendance')
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/attendance')
    cy.url().should('include', '/attendance', { timeout: 10_000 })
    cy.wait('@loadAttendance', { timeout: 15_000 })
    cy.closeDevDebugger()
  })

  it('date-picker has no min restriction for admin (can select past dates)', () => {
    // Admin's date-picker has no min attribute — all past dates are selectable.
    cy.get('[aria-label="Seleccionar fecha"]').should('not.have.attr', 'min')
    cy.get('[aria-label="Seleccionar fecha"]').should('have.value', TODAY)
  })

  it('shows no lock indicator and action buttons on a past date (admin can edit)', () => {
    // Use cy.setDateInput so React 18's onChange fires and selectedDate state updates.
    // @loadAttendance (from beforeEach) then captures the re-fetch for the new date.
    cy.setDateInput('[aria-label="Seleccionar fecha"]', YESTERDAY)
    cy.wait('@loadAttendance', { timeout: 10_000 })

    cy.contains('Solo lectura — día pasado').should('not.exist')
    cy.contains('button', 'Registrar entrada').should('exist')
  })

  it('shows reason field when admin registers a check-in on a past day', () => {
    cy.setDateInput('[aria-label="Seleccionar fecha"]', YESTERDAY)
    cy.wait('@loadAttendance', { timeout: 10_000 })

    // Use "Registrar entrada" — employees with no attendance on yesterday always show this button.
    cy.contains('button', 'Registrar entrada').first().click()

    cy.contains('label', 'Motivo de edición').should('be.visible')
    cy.get('textarea[id$="-reason"]').should('be.visible')
  })
})
