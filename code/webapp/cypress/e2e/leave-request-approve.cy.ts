/**
 * Leave Request — Submit & Approve flow — E2E test
 *
 * Happy-path: admin (acting as their own linked employee) requests a
 * permiso from the self-service Solicitudes page, then approves it from
 * the "Pendientes de aprobación" tab.
 *
 * Anticipated leave requests no longer go through the employee detail
 * panel's Ausencias tab (that only handles direct/express registration) —
 * they go through the generic Employee Requests module (type=LEAVE),
 * surfaced in /solicitudes.
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 * • beforeEach() → login via API + navigate to /solicitudes.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=leave-request-approve
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
    cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

const TEST_TIME_ISO = '2026-04-09T10:00:00-06:00'
const TEST_TIME_UTC = new Date('2026-04-09T16:00:00Z')

beforeEach(() => {
    cy.intercept({ url: /\/api\/v1\// }, (req) => {
        req.headers['X-Test-Time'] = TEST_TIME_ISO
        req.continue()
    }).as('apiWithTestTime')

    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/solicitudes')
    cy.url().should('include', '/solicitudes', { timeout: 10_000 })
    cy.closeDevDebugger()

    cy.clock(TEST_TIME_UTC.getTime(), ['Date'])
})

// ══════════════════════════════════════════════════════════════════════════════
// 1. Happy path — request permiso → appears as PENDING → approve
// ══════════════════════════════════════════════════════════════════════════════

describe('Leave Request — submit & approve (happy path)', () => {
    it('creates a LEAVE employee request as PENDING, then approves it', () => {
        cy.intercept('GET', '**/leave-types*').as('leaveTypesLoad')
        cy.intercept('POST', '**/employee-requests').as('createRequest')
        cy.intercept('PATCH', '**/employee-requests/*/approve').as('approveRequest')

        // 1. Click "Permiso" in the new-request bar
        cy.contains('h3', 'Nueva solicitud', { timeout: 10_000 }).should('be.visible')
        cy.contains('button', 'Permiso').click({ force: true })

        // 2. Slide panel opens with the leave request form
        cy.contains('h2', 'Solicitar permiso', { timeout: 10_000 }).should('be.visible')
        cy.wait('@leaveTypesLoad')

        // 3. Fill leave type and pick a day on the calendar (no day is preselected), submit
        cy.get('select').first().select('Incapacidad médica')
        cy.get('[aria-label="2026-04-20"]').click({ force: true })
        cy.contains('button', 'Enviar solicitud').click({ force: true })

        cy.wait('@createRequest').its('response.statusCode').should('eq', 201)

        // 4. It appears under "Pendientes de aprobación"
        cy.contains('button', 'Pendientes de aprobación', { timeout: 10_000 }).click({ force: true })
        cy.contains('Incapacidad médica', { timeout: 10_000 }).should('be.visible')

        // 5. Open the review panel and approve
        cy.contains('button', 'Revisar').click({ force: true })
        cy.contains('h2', /Solicitud de/, { timeout: 10_000 }).should('be.visible')
        cy.contains('button', 'Aprobar permiso').click({ force: true })

        cy.wait('@approveRequest').its('response.statusCode').should('eq', 200)

        // 6. The pending list no longer shows the request
        cy.contains('Incapacidad médica', { timeout: 10_000 }).should('not.exist')
    })
})
