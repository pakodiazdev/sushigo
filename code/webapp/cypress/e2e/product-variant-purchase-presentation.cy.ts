/**
 * Variant detail — Purchase Presentation lifecycle (#427)
 *
 * Exercises the nested Presentation screen inside a Variant's detail SlidePanel — one level
 * deeper than #425's Product → Variant nesting: assign an existing template, see it listed
 * with template/package type/factor/barcode/default/status, then deactivate and reactivate the
 * assignment, all without losing the Product/Variant panel state. See
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §5.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', null) (core only), then seeds one InventoryCategory, one
 *   UnitOfMeasure, one Product, one Variant and one PurchasePresentationTemplate directly via the
 *   API — none of these are part of the `core` seeder group, and Product/UOM/Presentation
 *   Testing-tier seed data is #428's job (CAT-07, not yet shipped), matching the same strategy
 *   already used by products-catalog.cy.ts (#423) and product-variant-catalog.cy.ts (#425).
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=product-variant-purchase-presentation
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const CATEGORY_NAME = 'Beverages'
const UOM_NAME = 'Kilogram'
const UOM_SYMBOL = 'kg'
const PRODUCT_NAME = 'Cypress Presentation Rice'
const VARIANT_NAME = 'Cypress Presentation Rice 1kg Bag'
const VARIANT_CODE = 'CYP-PRES-RICE-KG'
const TEMPLATE_NAME = 'Cypress Box x24'
const TEMPLATE_CODE = 'CYP_BOX_24'
const PACKAGE_BARCODE = '7501234567913'

// Accept: application/json so a request that 422s surfaces as a hard failure
// instead of Laravel's browser-style 302 redirect, which cy.request silently
// follows to a 200 (how this spec's original seed failure went unnoticed — #547).
const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' })

// Captured in before() and reused by beforeEach()'s per-attempt presentation purge.
let authToken = ''
let seededProductId = ''
let seededVariantId = ''

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })

  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/login`,
    body: { email: adminEmail, password: adminPassword },
    failOnStatusCode: true,
  }).then((loginRes) => {
    const token = loginRes.body.data.token as string
    authToken = token
    const headers = authHeaders(token)

    cy.request({
      method: 'POST',
      url: `${apiUrl}/inventory-categories`,
      headers,
      body: { name: CATEGORY_NAME },
      failOnStatusCode: true,
    }).then((categoryRes) => {
      const categoryId = categoryRes.body.data.id as string

      cy.request({
        method: 'POST',
        url: `${apiUrl}/units-of-measure`,
        headers,
        body: { code: 'KG', name: UOM_NAME, symbol: UOM_SYMBOL },
        failOnStatusCode: true,
      })
        // POST /units-of-measure returns the numeric primary key as `id`, but
        // every consumer (`uom_id`, `compatible_dimension_uom_id`) resolves the
        // UOM by its public_id string. Read it back from the list endpoint,
        // which serializes public_id as `id` like the rest of the API.
        .then(() =>
          cy.request({
            method: 'GET',
            url: `${apiUrl}/units-of-measure`,
            headers,
            failOnStatusCode: true,
          })
        )
        .then((uomListRes) => {
          const uom = (uomListRes.body.data as Array<{ id: string; code: string }>).find(
            (u) => u.code === 'KG'
          )
          expect(uom, 'seeded KG unit of measure is listed').to.not.be.undefined
          const uomId = (uom as { id: string }).id

          cy.request({
            method: 'POST',
            url: `${apiUrl}/inventory/purchase-presentation-templates`,
            headers,
            body: {
              code: TEMPLATE_CODE,
              name: TEMPLATE_NAME,
              package_type: 'BOX',
              base_unit_quantity: 24,
              compatible_dimension_uom_id: uomId,
            },
            failOnStatusCode: true,
          })

          cy.request({
            method: 'POST',
            url: `${apiUrl}/inventory/products`,
            headers,
            body: { name: PRODUCT_NAME, inventory_category_id: categoryId },
            failOnStatusCode: true,
          }).then((productRes) => {
            const productId = productRes.body.data.id as string
            seededProductId = productId

            cy.request({
              method: 'POST',
              url: `${apiUrl}/inventory/products/${productId}/variants`,
              headers,
              body: { name: VARIANT_NAME, code: VARIANT_CODE, uom_id: uomId },
              failOnStatusCode: true,
            }).then((variantRes) => {
              seededVariantId = variantRes.body.data.id as string
            })
          })
        })
    })
  })
})

describe('Variant detail — Purchase Presentation lifecycle', () => {
  beforeEach(() => {
    // Cypress `retries` re-runs the `it` and this beforeEach, but NOT before().
    // Without this purge, a retry that starts after the "Assign Presentation"
    // step would hit the leftover assignment and fail deterministically at
    // "Aún no hay presentaciones de compra" instead of retrying the real failure
    // (CI runs `cypress run --config retries=2` — see .github/workflows/_e2e-ci.yml).
    cy.request({
      method: 'GET',
      url: `${apiUrl}/inventory/products/${seededProductId}/variants/${seededVariantId}/purchase-presentations`,
      headers: authHeaders(authToken),
      failOnStatusCode: true,
    }).then((listRes) => {
      const presentations = listRes.body.data as Array<{ id: string }>
      presentations.forEach((presentation) => {
        cy.request({
          method: 'DELETE',
          url: `${apiUrl}/inventory/products/${seededProductId}/variants/${seededVariantId}/purchase-presentations/${presentation.id}`,
          headers: authHeaders(authToken),
          failOnStatusCode: true,
        })
      })
    })

    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/inventario/productos')
    cy.url().should('include', '/inventario/productos', { timeout: 10_000 })
    cy.contains(PRODUCT_NAME, { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('assigns a template, then deactivates and reactivates the presentation', () => {
    // ── 1. Navigate Product → Variant detail ──────────────────────────────
    cy.contains(PRODUCT_NAME).click()
    cy.contains('h2', PRODUCT_NAME, { timeout: 10_000 }).should('be.visible')

    cy.contains(VARIANT_NAME).click()
    cy.contains('h2', 'Detalle de la variante', { timeout: 10_000 }).should('be.visible')

    cy.contains('Presentaciones de compra').should('be.visible')
    cy.contains('Aún no hay presentaciones de compra').should('be.visible')

    // ── 2. Assign the seeded template ──────────────────────────────────────
    cy.contains('button', 'Asignar plantilla').click()
    cy.contains('h2', 'Asignar presentación de compra', { timeout: 10_000 }).should('be.visible')

    cy.get('form').within(() => {
      cy.get('select').select(`${TEMPLATE_NAME} (BOX · ×24)`)
      cy.get('input[placeholder*="unit barcode"]').type(PACKAGE_BARCODE, { force: true })
      cy.contains('label', 'Default presentation for this Variant').click()
      cy.contains('button', 'Assign Presentation').scrollIntoView().click({ force: true })
    })

    // ── 3. Confirm the panel transitioned back to Variant detail, showing it ──
    cy.contains('Purchase Presentation created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Detalle de la variante', { timeout: 10_000 }).should('be.visible')
    cy.contains(TEMPLATE_NAME).should('be.visible')
    cy.contains(PACKAGE_BARCODE).should('be.visible')
    cy.contains('Predeterminada').should('be.visible')

    // ── 4. Deactivate the assignment ────────────────────────────────────────
    cy.contains(TEMPLATE_NAME).click()
    cy.contains('h2', 'Editar presentación de compra', { timeout: 10_000 }).should('be.visible')
    // Template is read-only in edit mode — no selector for it.
    cy.get('form').find('select').should('not.exist')
    cy.contains('label', 'Active').click()
    cy.contains('button', 'Save Presentation').scrollIntoView().click({ force: true })

    cy.contains('Purchase Presentation updated successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Detalle de la variante', { timeout: 10_000 }).should('be.visible')
    cy.contains(TEMPLATE_NAME).parent().parent().within(() => {
      cy.contains('Inactiva').should('be.visible')
    })

    // ── 5. Reactivate it ─────────────────────────────────────────────────────
    cy.contains(TEMPLATE_NAME).click()
    cy.contains('h2', 'Editar presentación de compra', { timeout: 10_000 }).should('be.visible')
    cy.contains('label', 'Active').click()
    cy.contains('button', 'Save Presentation').scrollIntoView().click({ force: true })

    cy.contains('Purchase Presentation updated successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Detalle de la variante', { timeout: 10_000 }).should('be.visible')
    cy.contains(TEMPLATE_NAME).parent().parent().within(() => {
      cy.contains('Activa').should('be.visible')
    })

    // ── 6. Back out — no leftover nested state ────────────────────────────────
    cy.contains('button', 'Volver al producto').click()
    cy.contains('h2', PRODUCT_NAME, { timeout: 10_000 }).should('be.visible')
  })
})
