/**
 * Attendance Exempt Employee — E2E happy path
 *
 * Verifies that marking an employee as "Libre de asistencia" removes them
 * from the attendance list — their attendance is considered automatic, so
 * they no longer need to check in/out (roles like admin/super-admin).
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'attendance') ONCE per file.
 *   EMP-001 (Carlos Mendoza) is marked exempt during the test; EMP-002
 *   (María García) is left untouched as a control that stays tracked.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-exempt-employee
 */

import users from '../fixtures/users.json'

const { email, password } = users.admin

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

beforeEach(() => {
  cy.loginByApi(email, password)
})

it('excludes an employee marked "Libre de asistencia" from the attendance list', () => {
  // ── 1. Mark EMP-001 (Carlos Mendoza) as attendance-exempt ──────────────────
  cy.visitWithAuth('/employees')
  cy.closeDevDebugger()

  cy.contains('tr', 'EMP-001', { timeout: 10_000 })
    .find('button[title="Ver detalle"]')
    .click()
  cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')

  cy.contains('button', 'Editar').click()
  cy.contains('label', 'Libre de asistencia', { timeout: 10_000 })
    .find('[role="switch"]')
    .click({ force: true })
  cy.contains('button', 'Actualizar').click()

  // Back to the detail view — update succeeded
  cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')

  // ── 2. Verify EMP-001 no longer appears in the attendance list ─────────────
  cy.visitWithAuth('/attendance')
  cy.contains('Asistencia', { timeout: 10_000 }).should('be.visible')
  cy.closeDevDebugger()

  cy.contains('Mendoza, Carlos').should('not.exist')
  // Control: an employee that was not marked exempt still appears
  cy.contains('García, María', { timeout: 10_000 }).should('be.visible')
})
