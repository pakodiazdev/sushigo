/**
 * Attendance — Leave History (Employee Panel) — E2E tests
 *
 * Happy-path: after registering a leave via the Today view, navigate to the
 * employee detail panel in /employees and verify:
 *   1. The LeaveSummarySection shows a monthly badge and the recent leave
 *   2. The "Ver historial" button opens the FullHistoryDialog with a table row
 *   3. The status filter inside the dialog works
 *   4. The dialog can be closed via the X button
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 * • Step 1 of the first test registers a leave via UI (reusing attendance flow).
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-leave-history
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
    cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

const TEST_TIME_ISO = '2026-04-09T10:00:00-06:00'
const TEST_TIME_UTC = new Date('2026-04-09T16:00:00Z')

// ══════════════════════════════════════════════════════════════════════════════
// Happy path — leave history in employee detail panel
// ══════════════════════════════════════════════════════════════════════════════

describe('Leave History — employee detail panel', () => {
    beforeEach(() => {
        cy.intercept({ url: /\/api\/v1\// }, (req) => {
            req.headers['X-Test-Time'] = TEST_TIME_ISO
            req.continue()
        }).as('apiWithTestTime')

        cy.loginByApi(adminEmail, adminPassword)
        cy.visitWithAuth('/attendance/today')
        cy.url().should('include', '/attendance/today', { timeout: 10_000 })
        cy.closeDevDebugger()

        cy.clock(TEST_TIME_UTC.getTime(), ['Date'])
    })

    it('registers a leave, then verifies summary and full history dialog', () => {
        // ── 1. Register a medical absence from /attendance/today ────────────────

        cy.intercept('GET', '**/attendances/today*').as('refetchAttendance')
        cy.intercept('GET', '**/leave-types*').as('leaveTypesLoad')
        cy.intercept('POST', '**/leaves').as('registerLeave')

        cy.contains('p', 'Mendoza, Carlos', { timeout: 10_000 })
            .closest('div.rounded-xl')
            .scrollIntoView()
            .contains('button', 'Registrar ausencia')
            .scrollIntoView()
            .click({ force: true })

        cy.contains('h3', 'Registrar ausencia').should('be.visible')
        cy.wait('@leaveTypesLoad')
        cy.get('dialog select').first().select('Incapacidad médica')
        cy.get('dialog').contains('button', 'Registrar ausencia').click({ force: true })

        cy.wait('@registerLeave').its('response.statusCode').should('eq', 201)
        cy.wait('@refetchAttendance', { timeout: 10_000 })

        // ── 2. Navigate to /employees and open Mendoza detail panel ─────────────

        cy.clock().then((clock) => clock.restore())

        cy.visitWithAuth('/employees')
        cy.url().should('include', '/employees', { timeout: 10_000 })
        cy.closeDevDebugger()

        // Find Mendoza's row and click the detail button
        cy.contains('td', 'Carlos Mendoza', { timeout: 10_000 })
            .closest('tr')
            .find('button[title="Ver detalle"]')
            .click()

        // Panel should open
        cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')

        // ── 3. Verify LeaveSummarySection shows the registered leave ────────────

        // The "Ausencias" section header should be visible
        cy.contains('h3', 'Ausencias').should('be.visible')

        // Monthly summary should show a badge with "Incapacidad médica"
        cy.contains('Incapacidad médica', { timeout: 10_000 }).should('be.visible')

        // Recent leaves should show the leave
        cy.contains('Últimas ausencias').should('exist')
        cy.contains('Aprobada').should('exist')

        // ── 4. Open the full history dialog ─────────────────────────────────────

        cy.intercept('GET', '**/employees/*/leaves*').as('loadLeaves')

        cy.contains('button', 'Ver historial').scrollIntoView().click({ force: true })

        cy.wait('@loadLeaves', { timeout: 10_000 })

        // Dialog should open with the title
        cy.contains('h3', 'Historial de ausencias', { timeout: 10_000 }).should('be.visible')

        // Table should have the leave row
        cy.get('dialog table tbody tr').should('have.length.gte', 1)
        cy.get('dialog table').within(() => {
            cy.contains('td', 'Incapacidad médica').should('be.visible')
            cy.contains('Aprobada').should('be.visible')
            cy.contains('Sin goce').should('be.visible')
        })

        // ── 5. Test status filter ───────────────────────────────────────────────

        // Filter by PENDING — should show empty
        cy.get('dialog select[aria-label="Filtrar por estado"]').select('Pendiente')

        cy.contains('No se encontraron ausencias', { timeout: 10_000 }).should('be.visible')

        // Filter by APPROVED — should show the leave again
        cy.get('dialog select[aria-label="Filtrar por estado"]').select('Aprobada')

        cy.get('dialog table tbody tr', { timeout: 10_000 }).should('have.length.gte', 1)
        cy.get('dialog table').within(() => {
            cy.contains('td', 'Incapacidad médica').should('be.visible')
        })

        // ── 6. Close dialog via X button ────────────────────────────────────────

        cy.get('dialog button[aria-label="Cerrar"]').last().click({ force: true })

        cy.contains('h3', 'Historial de ausencias').should('not.exist')

        // Panel should still be open
        cy.contains('h2', 'Detalle de Empleado').should('be.visible')
    })
})
