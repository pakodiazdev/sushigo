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

describe('Cash Register code suggestion', () => {
  beforeEach(() => {
    // Reset per attempt, not once per file: CI runs `retries=2` and Cypress re-runs
    // beforeEach() — but not before() — on a retry. If an attempt created REG-001 and
    // then failed on a later assertion, a before()-scoped reset would leave that row
    // behind, the next suggestion would be REG-002, and the retry could never recover
    // from the original transient failure. There is a single test here, so the green
    // path still pays for exactly one reset.
    cy.task('test:reset', null, { timeout: 60_000 })

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
