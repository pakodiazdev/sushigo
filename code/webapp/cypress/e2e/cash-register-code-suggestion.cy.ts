/**
 * Cash Register code suggestion — E2E happy path (#498).
 *
 * Opening "Nueva Caja" prefills an editable REG-NNN suggestion fetched from the
 * server; accepting it as-is creates the register with that code.
 *
 * To run only this spec:
 *   make cypress-spec SPEC=cash-register-code-suggestion
 */
import users from '../fixtures/users.json'

const { email, password } = users.admin

const registerName = 'Cypress Caja Código Sugerido'

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

describe('Cash Register code suggestion', () => {
  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/cash/registers')
    cy.contains('Cajas Registradoras', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('prefills the next REG code and creates the register when it is accepted', () => {
    cy.contains('button', 'Nueva Caja').click()
    cy.contains('h2', 'Nueva Caja Registradora').should('be.visible')

    cy.contains('Sugerido automáticamente; puedes modificarlo.').should('be.visible')
    cy.get('input[aria-label="Código"]', { timeout: 10_000 }).should('have.value', 'REG-001')

    cy.get('input[aria-label="Nombre"]').type(registerName)
    cy.contains('button', 'Crear').click()

    cy.contains('Caja registradora creada', { timeout: 10_000 }).should('be.visible')

    cy.contains(registerName, { timeout: 10_000 }).should('be.visible')
    cy.contains('REG-001').should('be.visible')
  })
})
