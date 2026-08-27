/**
 * Per-Inventory-Location replenishment thresholds — happy path (#439)
 *
 * Replenishment min/max moved off the global Variant onto the (Inventory Location, Variant)
 * pair. This exercises the management UI where the issue puts it — the Stock Dashboard's
 * per-location detail — end to end: pick a location that has stock for a Variant, set that
 * Variant's reorder point / ceiling for that location, and confirm the resolved threshold and
 * the low-stock badge render from the saved policy.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', null) (core only) — seeds one Branch ("SushiGo Principal")
 *   with three Operating Units including "Inventario Principal", plus the admin user. It does
 *   NOT seed an Inventory Location, a UOM, a Product or any Stock, so those are created here via
 *   the API, mirroring price-lists.cy.ts / product-variant-purchase-presentation.cy.ts.
 * • An opening balance of 5 units is registered so the Variant has stock at the location; the
 *   reorder point set in the test (10) sits above it, so the row must render as "Low".
 *
 * Run just this file:
 *   make cypress-spec SPEC=replenishment-thresholds
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const OPERATING_UNIT_NAME = 'Inventario Principal'
const LOCATION_NAME = 'Cypress Replenish Store'
const LOCATION_TYPE = 'MAIN'
const LOCATION_OPTION_TEXT = `${LOCATION_NAME} (${LOCATION_TYPE})`

const CATEGORY_NAME = 'Cypress Replenish Beverages'
const PRODUCT_NAME = 'Cypress Replenish Rice'
const VARIANT_NAME = 'Cypress Replenish Rice 1kg'
const VARIANT_CODE = 'CYP-REPL-RICE-KG'

const ON_HAND = 5
const REORDER_POINT = 10
const CEILING = 100

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

    cy.request({ method: 'GET', url: `${apiUrl}/operating-units`, headers, failOnStatusCode: true })
      .then((ouRes) => {
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
                    cy.request({
                      method: 'POST',
                      url: `${apiUrl}/inventory/opening-balance`,
                      headers,
                      body: {
                        inventory_location_id: locationId,
                        item_variant_id: variantRes.body.data.id,
                        quantity: ON_HAND,
                        uom_id: uom!.id,
                        unit_cost: 2,
                      },
                      failOnStatusCode: true,
                    })
                  })
                })
              })
            })
          })
        })
      })
  })
})

describe('Replenishment thresholds (Stock Dashboard)', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/stock-dashboard')
    cy.contains('h1', 'Stock Dashboard', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('sets a per-location reorder point for a Variant and shows the resolved threshold and low badge', () => {
    // Pick the seeded location — this loads its per-location stock + policy detail.
    cy.get('select').first().select(LOCATION_OPTION_TEXT)

    cy.contains('h4', 'Replenishment thresholds', { timeout: 10_000 }).should('be.visible')

    cy.get(`[data-testid="replenishment-row-${VARIANT_CODE}"]`, { timeout: 10_000 })
      .should('contain.text', 'No threshold set')
      .within(() => {
        cy.contains('button', 'Set').click()
        cy.contains('label', 'Reorder point').parent().find('input').clear().type(String(REORDER_POINT))
        cy.contains('label', 'Ceiling').parent().find('input').clear().type(String(CEILING))
        cy.contains('button', 'Save').click()
      })

    cy.contains('Replenishment threshold saved', { timeout: 10_000 }).should('be.visible')

    cy.get(`[data-testid="replenishment-row-${VARIANT_CODE}"]`)
      .should('contain.text', `Reorder ${REORDER_POINT} · Ceiling ${CEILING}`)
      // on_hand (5) sits at/below the reorder point (10), so the row is low.
      .and('contain.text', 'Low')
  })
})
