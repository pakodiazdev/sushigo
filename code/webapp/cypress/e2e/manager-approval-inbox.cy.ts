/**
 * Manager Approval Inbox — E2E happy path (Task #125)
 *
 * Covers the manager-facing flow: a PENDING extra day request already exists
 * (seeded via API before the test), the manager navigates to /solicitudes,
 * switches to the "Pendientes de aprobación" tab, reviews the card, adjusts
 * the terms, approves the request, and verifies the inbox becomes empty.
 *
 * A second scenario covers the reject flow.
 *
 * User used: admin@sushigo.com
 *   - Has `employee-requests.create` (to seed the request via API)
 *   - Has `employee-requests.approve` (to act as manager in the inbox)
 *   - Has an Employee profile (ADM-001) linked in AttendanceTestSeeder
 *
 * To run only this file:
 *   make cypress-spec SPEC=manager-approval-inbox
 *   make cypress-debug SPEC=manager-approval-inbox
 */

import users from '../fixtures/users.json'

const { email, password } = users.admin

const API = Cypress.env('apiUrl') || 'https://devtest.api.sushigo.local/api/v1'
const FUTURE_DATE = '2099-06-15'

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a PENDING extra day request via API and returns the request id */
function seedPendingRequest(): Cypress.Chainable<string> {
  return cy
    .request({
      method: 'POST',
      url: `${API}/auth/login`,
      body: { email, password },
    })
    .then((loginRes) => {
      const token = loginRes.body.data.token as string

      // GET /employees/me returns the Employee profile linked to the authenticated user
      return cy
        .request({
          method: 'GET',
          url: `${API}/employees/me`,
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((meRes) => {
          const empId = meRes.body.data.id as string
          return cy
            .request({
              method: 'POST',
              url: `${API}/employee-requests`,
              headers: { Authorization: `Bearer ${token}` },
              body: {
                employee_id: empId,
                type: 'EXTRA_DAY',
                payload: { date: FUTURE_DATE, prima_pct: 100 },
                notes: 'Solicitud para test E2E del inbox',
              },
            })
            .then((createRes) => {
              return createRes.body.data.id as string
            })
        })
    })
}

function goToPendingTab() {
  cy.contains('Pendientes de aprobación', { timeout: 8_000 }).click()
}

// ══════════════════════════════════════════════════════════════════════════════
// Happy Path — approve a pending request
// ══════════════════════════════════════════════════════════════════════════════

describe('Manager Approval Inbox — Approve', () => {
  before(() => {
    seedPendingRequest()
  })

  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/solicitudes')
    cy.url().should('include', '/solicitudes', { timeout: 10_000 })
    cy.closeDevDebugger()
  })

  it('muestra el badge de pendientes y la tarjeta del empleado', () => {
    goToPendingTab()

    // Badge with count should be visible
    cy.contains('Pendientes de aprobación').parent().find('span').should('exist')

    // Card content
    cy.contains('➕ Día extra', { timeout: 8_000 }).should('be.visible')
    cy.contains('Prima propuesta: 100%').should('be.visible')
    cy.contains('Revisar →').should('be.visible')
  })

  it('abre el diálogo de revisión y aprueba la solicitud', () => {
    cy.intercept('PATCH', '**/employee-requests/*/approve').as('approve')
    cy.intercept('GET', '**/employee-requests*').as('listRequests')

    goToPendingTab()

    // Open review dialog
    cy.contains('Revisar →', { timeout: 8_000 }).click()
    cy.contains('Revisar solicitud', { timeout: 6_000 }).should('be.visible')

    // Approve with default terms
    cy.contains('button', 'Aprobar acuerdo').click()

    cy.wait('@approve').its('response.statusCode').should('eq', 200)

    // Inbox should now be empty
    cy.contains('Sin solicitudes pendientes de aprobación.', { timeout: 8_000 }).should('be.visible')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Reject flow
// ══════════════════════════════════════════════════════════════════════════════

describe('Manager Approval Inbox — Reject', () => {
  before(() => {
    seedPendingRequest()
  })

  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/solicitudes')
    cy.url().should('include', '/solicitudes', { timeout: 10_000 })
    cy.closeDevDebugger()
  })

  it('rechaza la solicitud con motivo y desaparece del inbox', () => {
    cy.intercept('PATCH', '**/employee-requests/*/reject').as('reject')

    goToPendingTab()

    cy.contains('Revisar →', { timeout: 8_000 }).click()
    cy.contains('Revisar solicitud', { timeout: 6_000 }).should('be.visible')

    // Click Rechazar → confirm dialog
    cy.contains('button', 'Rechazar').click()
    cy.contains('Rechazar solicitud', { timeout: 4_000 }).should('be.visible')

    // Fill reject reason
    cy.get('textarea').type('No hay operaciones ese día')
    cy.contains('button', 'Rechazar').last().click()

    cy.wait('@reject').its('response.statusCode').should('eq', 200)

    // Inbox empty after rejection
    cy.contains('Sin solicitudes pendientes de aprobación.', { timeout: 8_000 }).should('be.visible')
  })
})
