/**
 * Supplier code suggestion happy path (#497).
 *
 * Opening "Nuevo proveedor" prefills an editable PROV-NNN suggestion fetched from
 * the server; accepting it as-is creates the supplier with that code.
 *
 * Run with: make cypress-devlab-spec SPEC=suppliers-code-suggestion
 */
import users from '../fixtures/users.json'

const { email, password } = users.admin

const supplierName = 'Cypress Proveedor Código Sugerido'

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

describe('Supplier code suggestion', () => {
  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/inventario/proveedores')
    cy.contains('h1', 'Proveedores', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('prefills the next PROV code and creates the supplier when it is accepted', () => {
    cy.contains('button', 'Nuevo proveedor').click()
    cy.contains('h2', 'Nuevo proveedor').should('be.visible')

    cy.contains('Sugerido automáticamente').should('be.visible')
    cy.get('input[aria-label="Código"]')
      .should('have.value', 'PROV-001')

    cy.get('input[aria-label="Nombre del proveedor"]').type(supplierName)
    cy.contains('button', 'Crear proveedor').click()

    cy.contains('Proveedor creado', { timeout: 10_000 }).should('be.visible')

    cy.get('input[placeholder="Buscar por nombre o código..."]').type('PROV-001')
    cy.contains(supplierName, { timeout: 10_000 }).should('be.visible')
    cy.contains('PROV-001').should('be.visible')
  })
})
