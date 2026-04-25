/**
 * Employee Self-Request — Extra Day — E2E happy path (Task #124)
 *
 * Covers the employee-facing flow: an employee logs in, navigates to
 * /solicitudes, opens the "Solicitar día extra" form, submits a request,
 * sees it in the list as PENDING, and cancels it.
 *
 * User used: admin@sushigo.com (has Employee profile ADM-001 in test seeder)
 *
 * Happy path flow:
 *   1. Employee logs in and navigates to /solicitudes
 *   2. Clicks "➕ Día extra"
 *   3. ExtraDayRequestForm SlidePanel opens
 *   4. Enters a future date (2099-01-15)
 *   5. Leaves prima % at default (100)
 *   6. Clicks "Enviar solicitud"
 *   7. Request card appears with "⏳ Pendiente de aprobación"
 *   8. Employee clicks "Cancelar" on the card
 *   9. Card disappears from the list
 *
 * To run only this file:
 *   make cypress-spec SPEC=extra-day-employee-request
 *   make cypress-debug SPEC=extra-day-employee-request
 */

import users from '../fixtures/users.json'

const { email, password } = users.admin

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

beforeEach(() => {
  cy.loginByApi(email, password)
  cy.visitWithAuth('/solicitudes')
  cy.url().should('include', '/solicitudes', { timeout: 10_000 })
  cy.closeDevDebugger()
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function openExtraDayForm() {
  cy.contains('button', 'Día extra').click()
}

function assertSlidePanelOpen() {
  cy.contains('Solicitar día extra', { timeout: 8_000 }).should('be.visible')
}

// ══════════════════════════════════════════════════════════════════════════════
// Happy Path — submit request → PENDING card → cancel
// ══════════════════════════════════════════════════════════════════════════════

describe('Extra Day Employee Self-Request — Happy Path', () => {
  it('submits a request, sees PENDING card, then cancels it', () => {
    cy.intercept('POST', '**/employee-requests').as('createRequest')
    cy.intercept('PATCH', '**/employee-requests/*/cancel').as('cancelRequest')
    cy.intercept('GET', '**/employee-requests*').as('listRequests')

    // Step 1: Open the form
    openExtraDayForm()
    assertSlidePanelOpen()

    // Step 2: Enter a future date
    cy.get('input[type="date"]').clear().type('2099-01-15')

    // Step 3: Leave prima % at default (100) and submit
    cy.contains('button', 'Enviar solicitud').click()

    // Step 4: Wait for POST and verify 201
    cy.wait('@createRequest').its('response.statusCode').should('eq', 201)

    // Step 5: Verify PENDING card appears in the list
    cy.contains('Pendiente de aprobación', { timeout: 8_000 }).should('be.visible')
    cy.contains('⏳ Día extra solicitado').should('be.visible')

    // Step 6: Cancel the request
    cy.contains('button', 'Cancelar').click()

    cy.wait('@cancelRequest').its('response.statusCode').should('eq', 200)

    // Step 7: Card disappears (filtered out on refetch)
    cy.contains('No tienes solicitudes de días extra.', { timeout: 8_000 }).should('be.visible')
  })
})
