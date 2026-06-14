/**
 * Holiday Management — E2E happy path
 *
 * Verifies that an admin can view, add, edit, and delete holidays from the
 * holiday catalog page at /attendance/config/holidays.
 *
 * Seeder group: 'core' — base data only (no pre-seeded holidays).
 *
 * Happy path:
 *   1. Admin navigates to /attendance/config/holidays via the Asistencia sidebar.
 *   2. Empty state is displayed ("No hay días festivos registrados...").
 *   3. Admin adds a holiday — New Year's Day 2026, 2× multiplier.
 *   4. Row appears in the table.
 *   5. Admin edits the holiday name — success toast appears.
 *   6. Admin deletes the holiday — confirm dialog + toast.
 *   7. Table is empty again.
 *
 * For running only this file:
 *   make cypress-spec SPEC=holiday-management
 *   make cypress-debug SPEC=holiday-management
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

describe('Holiday Management — admin happy path', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
  })

  it('navigates to holidays page via sidebar', () => {
    cy.visitWithAuth('/')
    cy.get('body').should('be.visible')
    cy.closeDevDebugger()
    cy.contains('Asistencia').click()
    cy.contains('Festivos').click()
    cy.url().should('include', '/attendance/config/holidays', { timeout: 10_000 })
    cy.contains('Días Festivos', { timeout: 10_000 }).should('be.visible')
  })

  it('shows empty state when no holidays exist', () => {
    cy.visitWithAuth('/attendance/config/holidays')
    cy.get('body').should('be.visible')
    cy.closeDevDebugger()
    cy.contains('Días Festivos', { timeout: 10_000 }).should('be.visible')
    cy.contains('No hay días festivos registrados').should('be.visible')
  })

  it('adds a new holiday and shows it in the table', () => {
    cy.visitWithAuth('/attendance/config/holidays')
    cy.get('body').should('be.visible')
    cy.closeDevDebugger()
    cy.contains('Días Festivos', { timeout: 10_000 }).should('be.visible')

    cy.contains('button', 'Agregar festivo').click()

    cy.get('#add-date').type('2026-01-01')
    cy.get('#add-name').type("New Year's Day")

    cy.contains('button', 'Guardar').click()

    cy.contains('Festivo creado', { timeout: 10_000 }).should('be.visible')
    cy.contains("New Year's Day").should('be.visible')
    cy.contains('2026-01-01').should('be.visible')
    cy.contains('2× Doble').should('be.visible')
  })

  it('edits a holiday and shows a success toast', () => {
    cy.visitWithAuth('/attendance/config/holidays')
    cy.get('body').should('be.visible')
    cy.closeDevDebugger()
    cy.contains('Días Festivos', { timeout: 10_000 }).should('be.visible')

    // Click edit button for the first row
    cy.get('button[title="Editar festivo"]').first().click()

    // Clear the name field and type a new name
    cy.get('input[type="text"]').first().clear().type('Año Nuevo Actualizado')

    // Confirm the edit
    cy.get('button[title="Guardar"]').click()

    cy.contains('Festivo actualizado', { timeout: 10_000 }).should('be.visible')
    cy.contains('Año Nuevo Actualizado').should('be.visible')
  })

  it('deletes a holiday after confirmation', () => {
    cy.visitWithAuth('/attendance/config/holidays')
    cy.get('body').should('be.visible')
    cy.closeDevDebugger()
    cy.contains('Días Festivos', { timeout: 10_000 }).should('be.visible')

    cy.get('button[title="Eliminar festivo"]').first().click()

    // Confirmation dialog should appear
    cy.contains('Eliminar día festivo').should('be.visible')

    // Confirm deletion
    cy.contains('button', 'Eliminar').last().click()

    cy.contains('Festivo eliminado', { timeout: 10_000 }).should('be.visible')
    cy.contains('No hay días festivos registrados').should('be.visible')
  })
})
