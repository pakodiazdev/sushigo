/**
 * Vacation Policy Settings — E2E happy path (Task #214)
 *
 * Verifies that an admin can switch the tenant-wide vacation entitlement rule
 * from the LFT México 2022 default to a custom company policy with its own
 * years→days table, and that the change is reflected both in the settings
 * screen and in an employee's Vacaciones section.
 *
 * Seeder group: 'attendance' (AttendanceTestSeeder — seeds EMP-001 with a
 * 1-year-old employment period, which reaches its first anniversary and
 * auto-generates a year-1 VacationEntitlement using whichever policy is
 * active). 'core' alone has no employees.
 *
 * Happy path:
 *   1. Admin opens /configuracion → "Vacaciones" tab. LFT is selected by default.
 *   2. Admin switches to "Política personalizada", defines a custom table, saves.
 *   3. The change survives a page reload.
 *   4. EMP-001's Vacaciones section badge shows "Política de la empresa" and the
 *      auto-generated year-1 entitlement uses the custom day count.
 *
 * For running only this file:
 *   make cypress-spec SPEC=vacation-policy-settings
 *   make cypress-debug SPEC=vacation-policy-settings
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

function visitVacacionesTab() {
  cy.visitWithAuth('/configuracion')
  cy.closeDevDebugger()
  cy.contains('nav button', 'Vacaciones').click()
}

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

describe('Vacation Policy Settings — admin happy path', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
  })

  it('opens the Vacaciones tab with LFT selected and no tiers editor', () => {
    visitVacacionesTab()
    cy.contains('Reglas aplicables', { timeout: 10_000 }).should('be.visible')

    cy.get('input[type="radio"][value="VacationsLFTMX"]').should('be.checked')
    cy.contains('button', 'Agregar tramo').should('not.exist')
  })

  it('switches to a custom policy, defines a table, and saves', () => {
    visitVacacionesTab()
    cy.contains('Reglas aplicables', { timeout: 10_000 }).should('be.visible')

    cy.get('input[type="radio"][value="CustomCompanyPolicy"]').click()
    cy.contains('button', 'Agregar tramo').should('be.visible')

    // Default row: years_from=1, days=12 — bump days to 20 for a visibly different policy
    cy.get('input[name="tiers.0.days"]').clear().type('20')

    cy.contains('button', 'Guardar cambios').click()
    cy.contains('Política de vacaciones actualizada', { timeout: 10_000 }).should('be.visible')
  })

  it('persists the custom policy after a page reload', () => {
    visitVacacionesTab()
    cy.contains('Reglas aplicables', { timeout: 10_000 }).should('be.visible')

    cy.get('input[type="radio"][value="CustomCompanyPolicy"]').should('be.checked')
    cy.get('input[name="tiers.0.days"]').should('have.value', '20')
  })

  it("reflects the custom policy on EMP-001's Vacaciones section", () => {
    cy.visitWithAuth('/employees')
    cy.contains('tr', 'EMP-001', { timeout: 10_000 })
    cy.closeDevDebugger()

    cy.contains('tr', 'EMP-001').find('button[title="Ver detalle"]').click()
    cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()

    cy.get('[data-testid="vacation-section"]', { timeout: 10_000 })
      .scrollIntoView()
      .within(() => {
        cy.contains('Política de la empresa').should('be.visible')
        cy.contains('tr', '2026').should('contain.text', '20')
      })
  })
})
