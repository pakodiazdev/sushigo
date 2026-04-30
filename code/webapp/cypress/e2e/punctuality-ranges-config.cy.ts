/**
 * Punctuality Ranges Config — E2E happy path
 *
 * Verifies that an admin can view, edit, add, and remove punctuality bonus ranges.
 *
 * Seeder group: 'core' (always included — seeds PunctualityRangeSeeder with 5 default ranges)
 *
 * Happy path:
 *   1. Admin navigates to /attendance/punctuality-config via the sidebar.
 *   2. All 5 default ranges are rendered.
 *   3. Admin edits the first range bonus (100% → 95%) and saves — toast appears.
 *   4. Persisted value survives a page reload.
 *   5. Admin adds a new level — row count increases.
 *   6. Admin removes a level — row count decreases.
 *
 * For running only this file:
 *   make cypress-spec SPEC=punctuality-ranges-config
 *   make cypress-debug SPEC=punctuality-ranges-config
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

describe('Punctuality Ranges Config — admin happy path', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
  })

  it('navigates to the config page via the Asistencia sidebar', () => {
    cy.visitWithAuth('/')
    cy.closeDevDebugger()
    cy.contains('Asistencia').click()
    cy.contains('Puntualidad').click()
    cy.url().should('include', '/attendance/punctuality-config', { timeout: 10_000 })
    cy.contains('Rangos de Puntualidad', { timeout: 10_000 }).should('be.visible')
  })

  it('displays all 5 default ranges', () => {
    cy.visitWithAuth('/attendance/punctuality-config')
    cy.closeDevDebugger()
    cy.contains('Rangos de Puntualidad', { timeout: 10_000 }).should('be.visible')

    cy.get('form').find('[type="number"]').should('have.length', 10) // 5 rows × 2 inputs (threshold + bonus)

    // First bonus = 100, last bonus = 0
    cy.get('form').find('[type="number"]').eq(1).should('have.value', '100')
    cy.get('form').find('[type="number"]').last().should('have.value', '0')
  })

  it('saves an updated bonus percentage and shows a success toast', () => {
    cy.visitWithAuth('/attendance/punctuality-config')
    cy.closeDevDebugger()
    cy.contains('Rangos de Puntualidad', { timeout: 10_000 }).should('be.visible')

    // Edit first row's bonus (second input, index 1)
    cy.get('form').find('[type="number"]').eq(1).clear().type('95')
    cy.contains('button', 'Guardar cambios').click()

    cy.contains('Rangos de puntualidad actualizados', { timeout: 10_000 }).should('be.visible')
  })

  it('persists the saved bonus after a page reload', () => {
    cy.visitWithAuth('/attendance/punctuality-config')
    cy.closeDevDebugger()
    cy.contains('Rangos de Puntualidad', { timeout: 10_000 }).should('be.visible')

    cy.get('form').find('[type="number"]').eq(1).should('have.value', '95')
  })

  it('adds a new level and shows one more row', () => {
    cy.visitWithAuth('/attendance/punctuality-config')
    cy.closeDevDebugger()
    cy.contains('Rangos de Puntualidad', { timeout: 10_000 }).should('be.visible')

    // Count initial rows (5 default ranges = 10 number inputs)
    cy.get('form').find('[type="number"]').should('have.length', 10)

    cy.contains('button', 'Agregar nivel').click()

    // Now 6 rows = 12 number inputs
    cy.get('form').find('[type="number"]').should('have.length', 12)
  })

  it('removes a level and shows one fewer row', () => {
    cy.visitWithAuth('/attendance/punctuality-config')
    cy.closeDevDebugger()
    cy.contains('Rangos de Puntualidad', { timeout: 10_000 }).should('be.visible')

    cy.get('form').find('[type="number"]').should('have.length', 10)

    // Click delete on the second row (index 1)
    cy.get('form').find('button[title="Eliminar nivel"]').eq(1).click()

    // 4 rows = 8 number inputs
    cy.get('form').find('[type="number"]').should('have.length', 8)
  })
})
