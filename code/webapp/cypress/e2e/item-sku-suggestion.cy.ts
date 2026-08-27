/**
 * Item contextual SKU suggestion — E2E happy path (#500)
 *
 * Opening the "Item Rápido" form and typing a name prefills an editable,
 * name-derived SKU suggestion (`Salmón fresco` → `SAL-001`); accepting it
 * as-is creates the item with that SKU.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=item-sku-suggestion
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const itemName = 'Salmón fresco'
const expectedSku = 'SAL-001'

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

describe('Item Rápido — SKU sugerido', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/inventory/items')
    cy.url().should('include', '/inventory/items', { timeout: 10_000 })
    cy.contains('button', 'Item Rápido', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('prefills the name-derived SKU and creates the item when it is accepted', () => {
    cy.contains('button', 'Item Rápido').click()

    cy.contains(/Sugerencia automática a partir del nombre/).should('be.visible')

    cy.get('input[placeholder="e.g., Fresh Salmon"]').type(itemName, { force: true })

    // The suggestion request is debounced — wait for the SKU field to fill itself.
    cy.get('input[placeholder="e.g., SAL-001"]', { timeout: 10_000 }).should('have.value', expectedSku)

    cy.contains('button', 'Create Item').scrollIntoView().click({ force: true })

    cy.contains('Item created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains(expectedSku, { timeout: 10_000 }).should('be.visible')
  })
})
