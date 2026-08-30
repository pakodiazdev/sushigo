/** Happy path for semantic Purchase Presentation Template codes (#499). */
import users from '../fixtures/users.json'

const { email, password } = users.admin
const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'
const productName = 'Cypress Plantilla Semántica'
const variantName = 'Variante para Plantilla Semántica'
const templateName = 'Caja sugerida x24'

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
  cy.request('POST', `${apiUrl}/auth/login`, { email, password }).then(({ body }) => {
    const headers = { Authorization: `Bearer ${body.data.token as string}` }
    cy.request({ method: 'POST', url: `${apiUrl}/inventory-categories`, headers, body: { name: 'Categoría Código Semántico' } })
      .then(() => {
        cy.request({
          method: 'POST', url: `${apiUrl}/units-of-measure`, headers,
          body: { code: 'KG499', name: 'Kilogramo 499', symbol: 'kg499' },
        })
      })
  })
})

describe('Código semántico de plantilla de presentación', () => {
  it('crea una plantilla aceptando el código sugerido', () => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/inventario/productos')
    cy.closeDevDebugger()

    // Create the parent context through the UI. Creating Variants directly via API is
    // currently quarantined by #547 because they do not appear in this embedded list.
    cy.contains('button', 'New Product', { timeout: 10_000 }).click({ force: true })
    cy.get('form').within(() => {
      cy.get('input[placeholder="e.g., Coca-Cola Original 600 ml"]').type(productName, { force: true })
      cy.get('select').first().select('Categoría Código Semántico', { force: true })
      cy.contains('button', 'Create Product').scrollIntoView().click({ force: true })
    })
    cy.contains('Product created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('button', 'New Variant').click({ force: true })
    cy.get('form').within(() => {
      cy.get('input[placeholder="e.g., Arroz Premium 1kg"]').type(variantName, { force: true })
      cy.get('input[placeholder="e.g., ARR-KG"]').type('CYP-SEM-499', { force: true })
      cy.get('select').select('Kilogramo 499 (kg499)', { force: true })
      cy.contains('button', 'Create Variant').scrollIntoView().click({ force: true })
    })
    cy.contains('Variant created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('button', 'Gestionar plantillas').click({ force: true })
    cy.contains('button', 'Nueva plantilla').click({ force: true })

    cy.get('form').within(() => {
      cy.get('input[placeholder="Ej. Caja x24"]').type(templateName, { force: true })
      cy.get('select[name="package_type"]').select('BOX', { force: true })
      cy.get('input[name="base_unit_quantity"]').type('24', { force: true })
      cy.get('select[name="compatible_dimension_uom_id"]').select('Kilogramo 499 (kg499)', { force: true })
      cy.get('input[name="code"]').should('have.value', 'BOX_24')
      cy.contains('Sugerido automáticamente; puedes modificarlo.').should('exist')
      cy.contains('button', 'Crear plantilla').scrollIntoView().click({ force: true })
    })

    cy.contains('Plantilla creada', { timeout: 10_000 }).should('exist')
    cy.contains(templateName).should('exist')
    cy.contains('BOX_24').should('exist')
  })
})
