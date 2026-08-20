/**
 * Products Catalog — Progressive create → detail SlidePanel — E2E happy path (#423)
 *
 * Exercises the new /inventory/products page: creating a Product transitions the
 * *same* SlidePanel instance in place from the create form directly into the saved
 * Product's detail view — no navigation, no second panel. See
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §5.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', null) (core only). Product/Brand/InventoryCategory
 *   Testing-tier seed data is #428's job (CAT-07, not yet shipped) — this spec seeds the
 *   one InventoryCategory the create form requires directly via the API instead of
 *   adding a Testing/ seeder class ahead of that issue.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=products-catalog
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const CATEGORY_NAME = 'Beverages'

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })

  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/login`,
    body: { email: adminEmail, password: adminPassword },
    failOnStatusCode: true,
  }).then((loginRes) => {
    const token = loginRes.body.data.token as string
    return cy.request({
      method: 'POST',
      url: `${apiUrl}/inventory-categories`,
      headers: { Authorization: `Bearer ${token}` },
      body: { name: CATEGORY_NAME },
      failOnStatusCode: true,
    })
  })
})

describe('Products — Progressive create → detail SlidePanel', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/inventory/products')
    cy.url().should('include', '/inventory/products', { timeout: 10_000 })
    // A fresh `test:reset` (core only) leaves the Products list empty, so the
    // DataGrid renders its empty state instead of a <table> — wait for the
    // create button instead, which is always present.
    cy.contains('button', 'New Product', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('creates a Product and transitions the same panel to its saved detail view', () => {
    // ── 1. Open the create panel ──────────────────────────────────────────
    cy.contains('button', 'New Product').click()
    cy.contains('h2', 'New Product', { timeout: 10_000 }).should('be.visible')

    // ── 2. Fill in catalog-identity-only fields — never Variant/cost/price/UOM/stock ──
    // Scoped to the form — the page behind the SlidePanel also has Brand/Category
    // <select> filters, so an unscoped cy.get('select') would hit the wrong ones.
    cy.get('form').within(() => {
      cy.get('input[placeholder="e.g., Coca-Cola Original 600 ml"]').type('Cypress Soda 600 ml', {
        force: true,
      })
      cy.get('select').first().select(CATEGORY_NAME)
      cy.contains('button', 'Create Product').scrollIntoView().click({ force: true })
    })

    // ── 3. Confirm the same panel instance transitioned in place to the saved detail —
    //      no navigation, no second panel opening ──────────────────────────────────
    cy.contains('Product created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Cypress Soda 600 ml', { timeout: 10_000 }).should('be.visible')
    cy.contains('Edit Product').should('be.visible')
    cy.contains('No variants yet').should('be.visible')

    // ── 4. Confirm the list refreshes from canonical API data after create ─────────
    cy.contains('Close panel').parent().click({ force: true })
    cy.contains('Cypress Soda 600 ml', { timeout: 10_000 }).should('be.visible')
  })
})
