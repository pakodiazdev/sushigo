/**
 * Holiday Management — E2E happy path
 *
 * Verifies that an admin can view, add, edit, and delete holidays from the
 * holiday catalog page at /attendance/config/holidays.
 *
 * The "add holiday" flow goes through HolidayDefinition (POST /holiday-definitions).
 *
 * Seeder group: 'core' — base data only (no pre-seeded holiday definitions).
 *
 * Tests run sequentially sharing a single test:reset. DB state flows:
 *   Tests 1-2 : empty DB
 *   Test 3    : creates one-off holiday (non-annual, 2026-07-15)
 *   Tests 4-5 : edits then deletes that holiday → DB empty again
 *   Test 6    : creates annual fixed definition → auto-generated instance (2026-01-01)
 *
 * Happy paths covered:
 *   1. Navigate via sidebar
 *   2. Empty state
 *   3. Add one-off holiday (non-annual) — Manual chip
 *   4. Edit holiday instance
 *   5. Delete holiday
 *   6. Add annual holiday (fixed recurrence) — Auto chip
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

  it('adds a one-off holiday and shows it in the table', () => {
    cy.visitWithAuth('/attendance/config/holidays')
    cy.get('body').should('be.visible')
    cy.closeDevDebugger()
    cy.contains('Días Festivos', { timeout: 10_000 }).should('be.visible')

    cy.contains('button', 'Nuevo tipo de festivo').click()

    // Fill the name field
    cy.get('#add-name').type('Día de Prueba')

    // Change type to asueto — 2× fixed, no multiplier input required
    cy.get('#add-type').select('asueto')

    // Uncheck "¿Se repite cada año?" to switch to one-off mode (shows #add-date)
    cy.get('#add-is-annual').uncheck()

    // Date picker now visible — enter the holiday date
    cy.get('#add-date').type('2026-07-15')

    cy.contains('button', 'Guardar').click()

    cy.contains('Festivo creado', { timeout: 10_000 }).should('be.visible')
    cy.contains('Día de Prueba').should('be.visible')
    cy.contains('2026-07-15').should('be.visible')
    cy.contains('Asueto').should('be.visible')
    cy.contains('1× Normal').should('be.visible')
  })

  it('edits a holiday and shows a success toast', () => {
    cy.visitWithAuth('/attendance/config/holidays')
    cy.get('body').should('be.visible')
    cy.contains('Días Festivos', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()

    // Click edit button on the first row
    cy.get('button[title="Editar festivo"]').first().click()

    // react-hook-form injects name="name" on the input — unique selector vs global search bar
    cy.get('input[name="name"]').clear().type('Día de Prueba Actualizado')

    cy.get('button[title="Guardar"]').click()

    cy.contains('Festivo actualizado', { timeout: 10_000 }).should('be.visible')
    cy.contains('Día de Prueba Actualizado').should('be.visible')
  })

  it('deletes a holiday after confirmation', () => {
    cy.visitWithAuth('/attendance/config/holidays')
    cy.get('body').should('be.visible')
    cy.contains('Días Festivos', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()

    cy.get('button[title="Eliminar festivo"]').first().click()

    // Confirmation dialog
    cy.contains('Eliminar día festivo').should('be.visible')
    cy.contains('button', 'Eliminar').last().click()

    cy.contains('Festivo eliminado', { timeout: 10_000 }).should('be.visible')
    // One-off holidays don't regenerate — table returns to empty state
    cy.contains('No hay días festivos registrados').should('be.visible')
  })

  it('adds an annual holiday with fixed recurrence and shows it with Auto chip', () => {
    cy.visitWithAuth('/attendance/config/holidays')
    cy.get('body').should('be.visible')
    cy.closeDevDebugger()
    cy.contains('Días Festivos', { timeout: 10_000 }).should('be.visible')

    cy.contains('button', 'Nuevo tipo de festivo').click()

    cy.get('#add-name').type('Año Nuevo de Prueba')
    cy.get('#add-type').select('asueto')

    // is_annual is checked by default — RecurrenceBuilder is already visible
    // recurrence_type defaults to "fixed" — month and day selects appear

    cy.get('#add-rec-month').select('Enero')
    cy.get('#add-rec-day').type('1')

    cy.contains('button', 'Guardar').click()

    cy.contains('Festivo creado', { timeout: 10_000 }).should('be.visible')
    cy.contains('Año Nuevo de Prueba').should('be.visible')
    // Auto-generated instance — chip reads "Auto"
    cy.contains('Auto').should('be.visible')
    cy.contains('Asueto').should('be.visible')
    cy.contains('1× Normal').should('be.visible')
  })

})
