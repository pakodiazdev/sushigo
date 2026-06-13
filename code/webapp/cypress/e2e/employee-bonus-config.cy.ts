/**
 * Employee Bonus Config — E2E happy path
 *
 * Verifies that an admin can assign a punctuality bonus group to an employee
 * and see the current assignment displayed in the employee detail panel.
 *
 * Seeder group: 'attendance' — creates EMP-002 María García (cook) and seeds
 * PunctualityBonusGroupSeeder (3 groups) via core.
 *
 * Happy path:
 *   1. Admin navigates to /employees and opens María García's detail panel.
 *   2. "Grupo de Bono de Puntualidad" section is visible with no group assigned.
 *   3. Admin clicks "Asignar grupo", selects a group, sets a date, submits.
 *   4. Success toast appears.
 *   5. Current assignment card shows the group name and amounts.
 *
 * For running only this file:
 *   make cypress-spec SPEC=employee-bonus-config
 *   make cypress-debug SPEC=employee-bonus-config
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const EMPLOYEE_NAME = 'María García'

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

describe('Employee Bonus Config — admin happy path', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    // Wait for the employee table to render before closing the DevDebugger.
    // cy.closeDevDebugger uses a synchronous DOM check — React must be
    // hydrated first or the DevDebugger won't be found and stays open.
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('shows no bonus group assigned initially and allows assigning one', () => {
    // Open the employee detail panel for María García
    cy.contains(EMPLOYEE_NAME).closest('tr').find('button[aria-label="Ver detalle"]').click()
    // BonusConfigSection is deep in the panel — scroll it into view before asserting
    cy.contains('Grupo de Bono de Puntualidad').scrollIntoView().should('be.visible')

    // No group assigned yet
    cy.contains('Sin grupo de bono asignado').should('be.visible')

    // Open the assignment form
    cy.contains('button', 'Asignar grupo').click()

    // Wait for groups to load (select is disabled while loading).
    // Use native DOM + ownerDocument.defaultView.Event so React's event
    // delegation catches the change. cy.trigger uses jQuery synthetic events
    // which React 17+ does not pick up. Avoids Cypress visibility checks on
    // <option> elements (they are always 0x0 and cannot be forced).
    cy.get('select#bonus_group_id').should('be.visible').should('not.be.disabled').then(($select) => {
      const select = $select[0] as HTMLSelectElement
      const win = select.ownerDocument.defaultView as Window
      const firstRealOption = Array.from(select.options).find((o) => o.value !== '')
      if (!firstRealOption) throw new Error('No bonus group options loaded')
      select.value = firstRealOption.value
      select.dispatchEvent(new win.Event('change', { bubbles: true }))
    })

    // Set effective date
    const today = new Date().toISOString().slice(0, 10)
    cy.get('input#effective_from').type(today)

    // Submit
    cy.contains('button', 'Asignar').click()

    // Toast should appear
    cy.contains('Grupo de bono asignado').should('be.visible')

    // The current assignment card is now shown. Use data-testid to avoid
    // accidentally matching the <option value="active">Activos</option> in
    // the employee status filter select (which has 0x0 dimensions).
    cy.get('[data-testid="current-bonus-assignment"]').scrollIntoView().should('be.visible')
    cy.get('[data-testid="current-bonus-assignment"]').contains('Activo').should('be.visible')
    cy.contains('Sin grupo de bono asignado').should('not.exist')
  })
})
