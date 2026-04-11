/**
 * Leave Request — Submit & Approve flow — E2E test
 *
 * Happy-path: admin creates a leave request (PENDING) for an employee
 * from the employee detail panel, then approves it from the same panel.
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 * • beforeEach() → login via API + navigate to /employees.
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
    cy.visitWithAuth('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    cy.closeDevDebugger()

    cy.clock(TEST_TIME_UTC.getTime(), ['Date'])
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function openEmployeeDetail(name: string) {
    cy.contains('td', name, { timeout: 10_000 })
        .closest('tr')
        .find('button[title="Ver detalle"]')
        .click()
    cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Happy path — submit leave request → appears as PENDING → approve
// ══════════════════════════════════════════════════════════════════════════════

describe('Leave Request — submit & approve (happy path)', () => {
    it('creates a leave request as PENDING, then approves it', () => {
        cy.intercept('GET', '**/leave-types*').as('leaveTypesLoad')
        cy.intercept('POST', '**/leaves/requests').as('createRequest')
        cy.intercept('PATCH', '**/leaves/*/approve').as('approveLeave')

        // 1. Open employee detail panel
        openEmployeeDetail('Carlos Mendoza')

        // 2. Find "Ausencias" section and click "Solicitar permiso"
        cy.contains('h3', 'Ausencias', { timeout: 10_000 }).should('be.visible')
        cy.contains('button', 'Solicitar permiso').click({ force: true })

        // 3. Dialog should open with request mode title
        cy.contains('h3', 'Solicitar permiso').should('be.visible')
        cy.contains('Solicitud — requiere aprobación').should('be.visible')

        // 4. Select leave type and submit
        cy.wait('@leaveTypesLoad')
        cy.get('dialog select').first().select('Incapacidad médica')
        cy.get('dialog').contains('button', 'Solicitar permiso').click({ force: true })

        // 5. Verify API response
        cy.wait('@createRequest').its('response.statusCode').should('eq', 201)

        // 6. Verify PENDING leave appears in the history
        cy.contains('button', 'Ver historial').click({ force: true })
        cy.contains('Historial de ausencias', { timeout: 10_000 }).should('be.visible')

        // Filter by PENDING
        cy.get('select[aria-label="Filtrar por estado"]').select('Pendiente')
        cy.contains('td', 'Pendiente', { timeout: 10_000 }).should('be.visible')

        // 7. Approve the leave
        cy.get('button[aria-label="Aprobar ausencia"]').first().click({ force: true })
        cy.wait('@approveLeave').its('response.statusCode').should('eq', 200)

        // 8. After approval the row should show "Aprobada"
        cy.get('select[aria-label="Filtrar por estado"]').select('Todos los estados')
        cy.contains('td', 'Aprobada', { timeout: 10_000 }).should('be.visible')
    })
})
