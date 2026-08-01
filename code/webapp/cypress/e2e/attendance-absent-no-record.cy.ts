/**
 * Attendance Today — "Ausentes" without an Attendance record — E2E happy-path tests
 *
 * Covers issue #358: an employee on approved vacation, or whose schedule marks
 * today as a rest day, must show under "Ausentes" from the start of the day —
 * even before any Attendance record exists for today. Vacation is a terminal
 * state (hidden from the default grid, matching manually marked DAY_OFF), while
 * a scheduled rest day still exposes a live "Registrar entrada" action for
 * same-day extra-day check-ins, so it stays visible in the default grid too.
 *
 * Test date: 2026-04-09 (Thursday)
 *
 * Employees used (seeded by AttendanceAbsentNoRecordSeeder):
 *   EMP-007  Flores, Miguel   → approved VacationRequest covering today, NO Attendance record
 *   EMP-008  Vargas, Sofia    → schedule marks today (Thursday) as a rest day, NO Attendance record
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-absent-no-record
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance-absent-no-record', { timeout: 120_000 })
})

const TEST_TIME_ISO = '2026-04-09T10:00:00-06:00'
const TEST_TIME_UTC = new Date('2026-04-09T16:00:00Z')

beforeEach(() => {
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers['X-Test-Time'] = TEST_TIME_ISO
    req.continue()
  }).as('apiWithTestTime')

  cy.loginByApi(adminEmail, adminPassword)
  cy.visitWithAuth('/attendance')
  cy.url().should('include', '/attendance', { timeout: 10_000 })
  cy.get("[data-testid='stat-total']", { timeout: 10_000 }).should('be.visible')
  cy.closeDevDebugger()

  cy.clock(TEST_TIME_UTC.getTime(), ['Date'])
})

// ── Helpers ──────────────────────────────────────────────────────────────────

type StatTab = 'total' | 'pending' | 'checked-in' | 'done' | 'absent'

function clickTab(tab: StatTab) {
  cy.get(`[data-testid='stat-${tab}']`, { timeout: 10_000 }).click({ force: true })
}

// ══════════════════════════════════════════════════════════════════════════════

describe('"Ausentes" counts employees without an Attendance record yet', () => {
  it('counts both the vacationing employee and the scheduled-rest-day employee as absent', () => {
    cy.get("[data-testid='stat-absent']", { timeout: 10_000 }).find('p').first().should('have.text', '2')
  })

  it('shows Flores (vacation) and Vargas (rest day) under the "Ausentes" tab', () => {
    clickTab('absent')

    cy.contains('Flores', { timeout: 10_000 }).should('be.visible')
    cy.contains('Vargas').should('be.visible')
  })

  it("Flores's card shows the vacation chip and offers no check-in/falta actions", () => {
    clickTab('absent')

    cy.contains('p', 'Flores, Miguel', { timeout: 10_000 }).closest('div.rounded-xl').within(() => {
      cy.contains('Vacaciones aprobadas').should('be.visible')
      cy.contains('Registrar entrada').should('not.exist')
      cy.get("[data-testid='btn-mark-falta']").should('not.exist')
    })
  })

  it('hides Flores (vacation) from the default view — a terminal state that needs no action', () => {
    clickTab('total')
    cy.contains('Flores', { timeout: 10_000 }).should('exist')

    // Toggle "Total" off to return to the default view — VACATION is hidden.
    clickTab('total')
    cy.contains('Flores').should('not.exist')
  })

  it('keeps Vargas (rest day) visible in the default view — a live extra-day check-in action remains available', () => {
    clickTab('total')
    cy.contains('Vargas', { timeout: 10_000 }).should('exist')

    // Toggle "Total" off to return to the default view — the rest-day row stays visible,
    // unlike VACATION/manual DAY_OFF, since the card still exposes "Registrar entrada".
    clickTab('total')
    cy.contains('p', 'Vargas, Sofia', { timeout: 10_000 }).scrollIntoView().should('be.visible')
    cy.contains('p', 'Vargas, Sofia').closest('div.rounded-xl').within(() => {
      cy.contains('Descanso programado').should('be.visible')
      cy.contains('Registrar entrada').should('be.visible')
    })
  })

  it('neither employee sits under the "Pendientes" bucket tab — both are bucketed as absent', () => {
    clickTab('pending')
    cy.contains('Flores').should('not.exist')
    cy.contains('Vargas').should('not.exist')
  })
})
