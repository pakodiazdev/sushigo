/**
 * Attendance — Today View Leave Context Chip — E2E tests
 *
 * Happy-path: the Today view shows approved leave context on employee cards.
 * - EMP-007 (Flores, Miguel): OPEN_ENDED paid leave → full-day chip visible,
 *   "Registrar entrada" and "Marcar falta" buttons hidden.
 * - EMP-008 (Vargas, Sofia): SCHEDULED leave 13:00-16:00 CDMX, viewed at 10:00
 *   → "Llega a las" contextual chip visible, action buttons still present.
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance-today-leave') ONCE per file.
 * • beforeEach() → login via API + navigate to /attendance.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-today-leave-context
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance-today-leave', { timeout: 120_000 })
})

// Test time: 10:00 CDMX (before EMP-008's leave starts at 13:00)
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
  cy.closeDevDebugger()

  cy.clock(TEST_TIME_UTC.getTime(), ['Date'])

  // This spec isn't about the stat-card tabs — reveal every employee
  // regardless of bucket (issue #327 made the default view land on a
  // single bucket tab, e.g. "Pendientes").
  cy.get("[data-testid='stat-total']", { timeout: 10_000 }).click({ force: true })
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCard(lastName: string, firstName: string) {
  return cy
    .contains('p', `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest('div.rounded-xl')
    .scrollIntoView()
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Full-day leave (OPEN_ENDED) — chip visible, action buttons hidden
// ══════════════════════════════════════════════════════════════════════════════

describe('Today Leave — full-day approved leave (OPEN_ENDED)', () => {
  it('shows the full-day leave chip on the employee card', () => {
    getCard('Flores', 'Miguel').within(() => {
      cy.contains('Permiso aprobado (todo el día)', { timeout: 10_000 }).should('be.visible')
    })
  })

  it('hides "Registrar entrada" and "Marcar falta" buttons for full-day leave', () => {
    getCard('Flores', 'Miguel').within(() => {
      cy.contains('Registrar entrada').should('not.exist')
      cy.contains('Marcar falta').should('not.exist')
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. Partial leave (SCHEDULED) — contextual chip visible, action buttons present
// ══════════════════════════════════════════════════════════════════════════════

describe('Today Leave — partial scheduled leave (SCHEDULED)', () => {
  it('shows a contextual "Llega a las" chip when the leave starts after now', () => {
    // At 10:00 CDMX the scheduled leave starts at 13:00 → still in the future
    getCard('Vargas', 'Sofia').within(() => {
      cy.contains(/Llega a las/, { timeout: 10_000 }).should('be.visible')
    })
  })

  it('keeps "Registrar entrada" and "Marcar falta" buttons for partial-day leave', () => {
    getCard('Vargas', 'Sofia').within(() => {
      cy.contains('Registrar entrada').should('be.visible')
      cy.contains('Marcar falta').should('be.visible')
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 3. Employee without leave — no chip
// ══════════════════════════════════════════════════════════════════════════════

describe('Today Leave — employee with no approved leave', () => {
  it('does not show any leave chip for employees without leave', () => {
    getCard('Mendoza', 'Carlos').within(() => {
      cy.contains('Permiso aprobado').should('not.exist')
      cy.contains(/Llega a las/).should('not.exist')
      cy.contains(/Salió a las/).should('not.exist')
    })
  })
})
