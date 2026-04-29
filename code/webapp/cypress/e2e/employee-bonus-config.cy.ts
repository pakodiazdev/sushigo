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
    cy.closeDevDebugger()
  })

  it('shows no bonus group assigned initially and allows assigning one', () => {
    // Open the employee detail panel for María García
    cy.contains(EMPLOYEE_NAME).closest('tr').find('button[aria-label="Ver detalle"]').click()
    cy.contains('Grupo de Bono de Puntualidad').should('be.visible')

    // No group assigned yet
    cy.contains('Sin grupo de bono asignado').should('be.visible')

    // Open the assignment form
    cy.contains('button', 'Asignar grupo').click()

    // Select a group from the dropdown
    cy.get('select#bonus_group_id').should('be.visible').select(1)

    // Set effective date
    const today = new Date().toISOString().slice(0, 10)
    cy.get('input#effective_from').type(today)

    // Submit
    cy.contains('button', 'Asignar').click()

    // Toast should appear
    cy.contains('Grupo de bono asignado').should('be.visible')

    // The current assignment card is now shown
    cy.contains('Activo').should('be.visible')
    cy.contains('Sin grupo de bono asignado').should('not.exist')
  })
})
