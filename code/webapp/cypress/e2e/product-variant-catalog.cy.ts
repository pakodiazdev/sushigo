/**
 * Product detail — embedded Variant catalog and CRUD (#425)
 *
 * Exercises the nested Variant create/detail flow inside a Product's detail SlidePanel:
 * the *same* panel instance takes over from the Product's general view to a Variant screen
 * and back — no second top-level panel. See
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §5.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', null) (core only), then seeds one InventoryCategory
 *   (same as products-catalog.cy.ts, #423) and one UnitOfMeasure directly via the API —
 *   neither is part of the `core` seeder group, and Product/UOM Testing-tier seed data is
 *   #428's job (CAT-07, not yet shipped).
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=product-variant-catalog
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const CATEGORY_NAME = 'Beverages'
const UOM_NAME = 'Kilogram'
const UOM_SYMBOL = 'kg'

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })

  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/login`,
    body: { email: adminEmail, password: adminPassword },
    failOnStatusCode: true,
  }).then((loginRes) => {
    const token = loginRes.body.data.token as string
    const headers = { Authorization: `Bearer ${token}` }

    cy.request({
      method: 'POST',
      url: `${apiUrl}/inventory-categories`,
      headers,
      body: { name: CATEGORY_NAME },
      failOnStatusCode: true,
    })

    cy.request({
      method: 'POST',
      url: `${apiUrl}/units-of-measure`,
      headers,
      body: { code: 'KG', name: UOM_NAME, symbol: UOM_SYMBOL },
      failOnStatusCode: true,
    })
  })
})

describe('Product detail — embedded Variant catalog', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/inventario/productos')
    cy.url().should('include', '/inventario/productos', { timeout: 10_000 })
    cy.contains('button', 'New Product', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('creates a Product, adds its first Variant from the embedded catalog, and shows it back in the list', () => {
    // ── 1. Create the Product (same flow as #423) ──────────────────────────
    cy.contains('button', 'New Product').click()
    cy.contains('h2', 'New Product', { timeout: 10_000 }).should('be.visible')

    cy.get('form').within(() => {
      cy.get('input[placeholder="e.g., Coca-Cola Original 600 ml"]').type('Cypress Rice 1kg', {
        force: true,
      })
      cy.get('select').first().select(CATEGORY_NAME)
      cy.contains('button', 'Create Product').scrollIntoView().click({ force: true })
    })

    cy.contains('Product created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Cypress Rice 1kg', { timeout: 10_000 }).should('be.visible')
    cy.contains('No variants yet').should('be.visible')

    // ── 2. Open the nested Variant create screen — same panel, no navigation ──
    cy.contains('button', 'New Variant').click()
    cy.contains('h2', 'New Variant', { timeout: 10_000 }).should('be.visible')

    // No Product/Item selector — the parent Product is fixed by the route, not the form.
    cy.get('form').should('not.contain.text', 'Product')

    cy.get('form').within(() => {
      cy.get('input[placeholder="e.g., Arroz Premium 1kg"]').type('Cypress Rice 1kg Bag', { force: true })
      cy.get('input[placeholder="e.g., ARR-KG"]').type('CYP-RICE-KG', { force: true })
      cy.get('select').select(`${UOM_NAME} (${UOM_SYMBOL})`)
      cy.contains('button', 'Create Variant').scrollIntoView().click({ force: true })
    })

    // ── 3. Confirm the same panel transitioned to the saved Variant's detail ──
    cy.contains('Variant created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Variant Detail', { timeout: 10_000 }).should('be.visible')
    cy.contains('Cypress Rice 1kg Bag').should('be.visible')
    cy.contains('CYP-RICE-KG').should('be.visible')

    // ── 4. Back to the Product — the catalog now shows the new Variant ───────
    cy.contains('button', 'Back to Product').click()
    cy.contains('h2', 'Cypress Rice 1kg', { timeout: 10_000 }).should('be.visible')
    cy.contains('Cypress Rice 1kg Bag').should('be.visible')
    cy.contains('No variants yet').should('not.exist')

    // ── 5. Close the panel — the outer list's own Variants column also reflects it ──
    cy.contains('Close panel').parent().click({ force: true })
    cy.contains('Cypress Rice 1kg', { timeout: 10_000 }).should('be.visible')
  })
})
