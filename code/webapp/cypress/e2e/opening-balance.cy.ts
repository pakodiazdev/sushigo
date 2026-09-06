/**
 * Opening Balance workflow — happy path (#570)
 *
 * The Opening Balance form is now mounted on the canonical Existencias page
 * (`/inventario/existencias`), gated behind `stock.manage`. This exercises it end
 * to end: open the panel, pick an active accessible Location and a catalog
 * Variant, enter quantity / UOM / unit cost, see the conversion + valuation
 * preview computed by the backend, post the balance, and confirm the new stock
 * shows in the Location detail without a full-page reload.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', null) (core only) — seeds one Branch with
 *   Operating Units including "Inventario Principal" plus the admin user. It does
 *   NOT seed an Inventory Location, a UOM, a Product or any Stock, so those are
 *   created here via the API (mirrors variant-location-assignments.cy.ts).
 *
 * Run just this file:
 *   make cypress-spec SPEC=opening-balance
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const OPERATING_UNIT_NAME = 'Inventario Principal'
const LOCATION_NAME = 'Cypress Opening Balance Store'
const CATEGORY_NAME = 'Cypress Opening Balance Pantry'
const PRODUCT_NAME = 'Cypress Opening Balance Rice'
const VARIANT_NAME = 'Cypress Opening Balance Rice 1kg'
const VARIANT_CODE = 'CYP-OB-RICE-KG'

let locationId = ''
let variantId = ''
let uomKgId = ''

function apiHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' }
}

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })

  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/login`,
    body: { email: adminEmail, password: adminPassword },
    failOnStatusCode: true,
  }).then((loginRes) => {
    const headers = apiHeaders(loginRes.body.data.token as string)

    cy.request({ method: 'GET', url: `${apiUrl}/operating-units`, headers, failOnStatusCode: true }).then(
      (ouRes) => {
        const unit = (ouRes.body.data as Array<{ id: number; name: string }>).find(
          (candidate) => candidate.name === OPERATING_UNIT_NAME
        )
        expect(unit, 'seeded operating unit').to.exist

        cy.request({
          method: 'POST',
          url: `${apiUrl}/inventory-locations`,
          headers,
          body: { operating_unit_id: unit!.id, name: LOCATION_NAME, type: 'MAIN', priority: 100 },
          failOnStatusCode: true,
        }).then((locRes) => {
          locationId = locRes.body.data.id
        })

        cy.request({
          method: 'POST',
          url: `${apiUrl}/units-of-measure`,
          headers,
          body: { code: 'KG', name: 'Kilogram', symbol: 'kg' },
          failOnStatusCode: true,
        })

        cy.request({
          method: 'POST',
          url: `${apiUrl}/inventory-categories`,
          headers,
          body: { name: CATEGORY_NAME },
          failOnStatusCode: true,
        }).then((catRes) => {
          cy.request({
            method: 'GET',
            url: `${apiUrl}/units-of-measure?per_page=100`,
            headers,
            failOnStatusCode: true,
          }).then((uomsRes) => {
            const uom = (uomsRes.body.data as Array<{ id: string; code: string }>).find(
              (candidate) => candidate.code === 'KG'
            )
            expect(uom, 'prepared unit of measure').to.exist
            uomKgId = uom!.id

            cy.request({
              method: 'POST',
              url: `${apiUrl}/inventory/products`,
              headers,
              body: { name: PRODUCT_NAME, inventory_category_id: catRes.body.data.id },
              failOnStatusCode: true,
            }).then((productRes) => {
              cy.request({
                method: 'POST',
                url: `${apiUrl}/inventory/products/${productRes.body.data.id}/variants`,
                headers,
                body: { name: VARIANT_NAME, code: VARIANT_CODE, uom_id: uom!.id },
                failOnStatusCode: true,
              }).then((variantRes) => {
                variantId = variantRes.body.data.id
              })
            })
          })
        })
      }
    )
  })
})

describe('Opening Balance from Existencias', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/inventario/existencias')
    cy.contains('h1', 'Stock Dashboard', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('posts an opening balance and the new stock appears without a reload', () => {
    // Header trigger — the first button with this label; distinct from the
    // panel's submit button, which is bound to the form via its `form` attr.
    cy.contains('button', 'Registrar saldo inicial', { timeout: 10_000 }).first().click()

    cy.contains('h2', 'Registrar saldo inicial', { timeout: 10_000 }).should('be.visible')

    cy.get('#opening-balance-form').within(() => {
      cy.contains('label', 'Ubicación').parent().find('select').select(locationId)
      cy.contains('label', 'Variante').parent().find('select').select(variantId)
      // The entry UoM auto-fills from the variant only when the /item-variants
      // list carries the relation; set it explicitly so the preview always fires.
      cy.contains('label', 'Unidad de medida').parent().find('select').select(uomKgId)
      cy.contains('label', 'Cantidad').parent().find('input').clear().type('40')
      cy.contains('label', 'Costo unitario').parent().find('input').clear().type('12.5')
    })

    // Backend-computed preview shows the total value.
    cy.contains('Resumen antes de registrar', { timeout: 10_000 }).should('be.visible')
    cy.contains('$500.00').should('be.visible')

    // Submit via the form-bound button, not the header trigger (cy.contains
    // yields only the first match, so `.last()` would still click the header one,
    // which the open panel now covers).
    cy.get('button[type="submit"][form="opening-balance-form"]').click()

    cy.contains('Saldo inicial registrado correctamente', { timeout: 10_000 }).should('be.visible')

    // Existencias refetched without a reload (no cy.reload): the Location filter
    // now surfaces the posted stock in the location detail view. Assert `exist`
    // rather than `be.visible` — the detail's item list is a `max-h-96
    // overflow-y-auto` scroll container, so Cypress's overflow-visibility rule
    // would flag a perfectly-rendered row as hidden.
    cy.get('select').first().select(locationId)
    cy.contains('h3', LOCATION_NAME, { timeout: 10_000 }).should('be.visible')
    cy.contains(VARIANT_CODE, { timeout: 10_000 }).should('exist')
  })
})
