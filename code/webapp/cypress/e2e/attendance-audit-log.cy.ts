/**
 * Attendance Audit Log Viewer — E2E Happy Path
 *
 * Covers issue #084: Admin can query the change history of an attendance
 * record, with before/after values, the user who made the change, and
 * their justification (reason).
 *
 * Flow:
 *   1. Admin registers a check-in on a PAST day (requires a reason, per #083).
 *   2. Admin opens "Ver historial" on that same attendance card.
 *   3. The audit dialog shows the reason for that change.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'attendance') ONCE per file.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-audit-log
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const TEST_TIME_ISO = '2026-04-02T14:30:00-06:00'
const TEST_TIME_UTC = new Date('2026-04-02T20:30:00Z')
const YESTERDAY = '2026-04-01'
const REASON = 'Corrección de horario — cámara confirma llegada real'

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

describe('Attendance audit log viewer', () => {
  beforeEach(() => {
    cy.intercept({ url: /\/api\/v1\// }, (req) => {
      req.headers['X-Test-Time'] = TEST_TIME_ISO
      req.continue()
    }).as('apiWithTestTime')

    cy.intercept('GET', '**/attendances/today**').as('loadAttendance')
    cy.intercept('GET', '**/audit-logs**').as('loadAuditLogs')

    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/attendance')
    cy.url().should('include', '/attendance', { timeout: 10_000 })
    cy.wait('@loadAttendance', { timeout: 15_000 })
    cy.closeDevDebugger()

    cy.clock(TEST_TIME_UTC.getTime(), ['Date'])
  })

  it('shows the reasoned check-in in the record audit history', () => {
    cy.setDateInput('[aria-label="Seleccionar fecha"]', YESTERDAY)
    cy.wait('@loadAttendance', { timeout: 10_000 })

    cy.intercept('GET', '**/attendances/today*').as('refetchAttendance')

    cy.contains('button', 'Registrar entrada').first().click({ force: true })
    cy.get('#checkin-time').clear({ force: true }).type('08:05', { force: true })
    cy.get('#checkin-time-reason').type(REASON, { force: true })
    cy.contains('button', 'Confirmar entrada').should('not.be.disabled').click()
    cy.wait('@refetchAttendance', { timeout: 10_000 })

    cy.get('[data-testid="btn-view-audit"]').first().click({ force: true })
    cy.wait('@loadAuditLogs', { timeout: 10_000 })

    cy.contains('Auditoría').should('be.visible')
    cy.contains(REASON).should('be.visible')
  })
})
