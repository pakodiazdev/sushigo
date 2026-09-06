/**
 * Existencias shows an assigned Variant with zero Stock — happy path (#571)
 *
 * The Existencias dashboard is spined on the managed Variant-to-Location
 * assignment (#569), not on Stock: a Variant assigned to a Location but never
 * received still appears, projected as zero on-hand / value with no database
 * Stock row, and — when a live replenishment policy exists — as a valid
 * low-stock alert.
 *
 * This exercises that end to end: assign a brand-new Variant to a Location via
 * the API (no opening balance, no receipt), give it a reorder point of 0, then
 * open `/inventario/existencias` and confirm the projected zero row renders in
 * the summary, in the low-stock table, and in the per-location detail —
 * labelled "nunca recibido", never implying a Stock record exists.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', null) (core only) — seeds one Branch with
 *   three Operating Units including "Inventario Principal" plus the admin user.
 *   No Inventory Location, UOM, Product or Stock is seeded, so those are created
 *   here via the API, mirroring variant-location-assignments.cy.ts.
 *
 * Run just this file:
 *   make cypress-spec SPEC=existencias-assigned-zero-stock
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const OPERATING_UNIT_NAME = 'Inventario Principal'
const LOCATION_NAME = 'Cypress Zero-Stock Store'
const LOCATION_TYPE = 'MAIN'
const LOCATION_OPTION_TEXT = `${LOCATION_NAME} (${LOCATION_TYPE})`

const CATEGORY_NAME = 'Cypress Zero-Stock Beverages'
const PRODUCT_NAME = 'Cypress Zero-Stock Rice'
const VARIANT_NAME = 'Cypress Zero-Stock Rice 1kg'
const VARIANT_CODE = 'CYP-ZERO-RICE-KG'

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
          body: { operating_unit_id: unit!.id, name: LOCATION_NAME, type: LOCATION_TYPE, priority: 100 },
          failOnStatusCode: true,
        }).then((locRes) => {
          const locationId = locRes.body.data.id as string

          cy.request({
            method: 'POST',
            url: `${apiUrl}/units-of-measure`,
            headers,
            body: { code: 'KG', name: 'Kilogram', symbol: 'kg' },
            failOnStatusCode: true,
          }).then(() => {
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

              cy.request({
                method: 'POST',
                url: `${apiUrl}/inventory-categories`,
                headers,
                body: { name: CATEGORY_NAME },
                failOnStatusCode: true,
              }).then((catRes) => {
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
                    const variantId = variantRes.body.data.id as string

                    // Assign the Variant to the Location — no opening balance,
                    // no receipt: this must not create a Stock row.
                    cy.request({
                      method: 'PUT',
                      url: `${apiUrl}/inventory-locations/${locationId}/variant-assignments/${variantId}`,
                      headers,
                      failOnStatusCode: true,
                    })

                    // A reorder point of 0 makes the never-received row a valid
                    // low-stock alert (0 <= min_stock).
                    cy.request({
                      method: 'PUT',
                      url: `${apiUrl}/inventory-locations/${locationId}/replenishment-policies/${variantId}`,
                      headers,
                      body: { min_stock: 0, max_stock: 20 },
                      failOnStatusCode: true,
                    })
                  })
                })
              })
            })
          })
        })
      }
    )
  })
})

describe('Existencias — assigned Variant with zero Stock (#571)', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/inventario/existencias')
    cy.contains('h1', 'Existencias', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('projects the never-received assigned Variant as a zero low-stock row', () => {
    // The never-received assigned Variant surfaces as a valid low-stock alert
    // (a live policy exists and 0 <= min_stock), tagged so it never implies a
    // Stock record exists. Assert on content, not `be.visible` — sections
    // deep in this page are clipped by an overflow ancestor (#549).
    cy.contains('h3', 'Alertas de stock bajo', { timeout: 10_000 }).should('exist')
    cy.contains('td', VARIANT_CODE, { timeout: 10_000 })
      .should('exist')
      .and('contain.text', 'nunca recibido')

    // The per-location detail lists it at zero, still labelled "nunca recibido".
    cy.get('select').first().select(LOCATION_OPTION_TEXT, { force: true })
    cy.contains('h4', 'Variantes en esta Ubicación', { timeout: 10_000 }).should('exist')
    cy.contains('.max-h-96', VARIANT_CODE, { timeout: 10_000 })
      .should('exist')
      .and('contain.text', 'nunca recibido')
      .and('contain.text', 'Existencia')
  })
})
