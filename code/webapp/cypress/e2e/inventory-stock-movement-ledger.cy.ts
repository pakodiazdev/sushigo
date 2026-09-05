/**
 * Inventory Stock Movement ledger — UI happy path (#574).
 *
 * The ledger is a read-only window onto the immutable Stock Movement history.
 * This spec seeds real evidence (an Opening Balance, which posts one
 * OPENING_BALANCE entry movement), then drives the operator-facing flow: open
 * `Inventario > Movimientos`, find the movement by filtering on its reason,
 * open its detail, and confirm the originating operation and the Location
 * direction (external → destination) it describes.
 *
 * Error/permission/validation cases live in the PHPUnit + Vitest suites — this
 * only covers the user-visible happy path.
 *
 * DB reset strategy
 * ─────────────────
 * before() → cy.task('test:reset', null) seeds one Branch with the "Inventario
 * Principal" Operating Unit and the admin user's active assignment to it. It
 * does NOT seed an Inventory Location, UOM, Product or Stock, so those are
 * created here via the API (mirrors replenishment-thresholds.cy.ts).
 *
 * Run just this file:
 *   make cypress-spec SPEC=inventory-stock-movement-ledger
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const OPERATING_UNIT_NAME = 'Inventario Principal'
const LOCATION_NAME = 'Cypress Ledger Warehouse'
const LOCATION_TYPE = 'MAIN'
const CATEGORY_NAME = 'Cypress Ledger Beverages'
const PRODUCT_NAME = 'Cypress Ledger Rice'
const VARIANT_NAME = 'Cypress Ledger Rice 1kg'
const VARIANT_CODE = 'CYP-LEDGER-RICE-KG'
const OPENING_QTY = 8

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

    cy.request({ method: 'GET', url: `${apiUrl}/operating-units`, headers }).then((ouRes) => {
      const unit = (ouRes.body.data as Array<{ id: number; name: string }>).find(
        (candidate) => candidate.name === OPERATING_UNIT_NAME
      )
      expect(unit, 'seeded operating unit').to.exist

      cy.request({
        method: 'POST',
        url: `${apiUrl}/inventory-locations`,
        headers,
        body: { operating_unit_id: unit!.id, name: LOCATION_NAME, type: LOCATION_TYPE, priority: 100 },
      }).then((locRes) => {
        const locationId = locRes.body.data.id as string

        cy.request({
          method: 'POST',
          url: `${apiUrl}/units-of-measure`,
          headers,
          body: { code: 'KG', name: 'Kilogram', symbol: 'kg' },
        })

        cy.request({ method: 'GET', url: `${apiUrl}/units-of-measure?per_page=100`, headers }).then((uomsRes) => {
          const uom = (uomsRes.body.data as Array<{ id: string; code: string }>).find(
            (candidate) => candidate.code === 'KG'
          )
          expect(uom, 'prepared unit of measure').to.exist

          cy.request({
            method: 'POST',
            url: `${apiUrl}/inventory-categories`,
            headers,
            body: { name: CATEGORY_NAME },
          }).then((catRes) => {
            cy.request({
              method: 'POST',
              url: `${apiUrl}/inventory/products`,
              headers,
              body: { name: PRODUCT_NAME, inventory_category_id: catRes.body.data.id },
            }).then((productRes) => {
              cy.request({
                method: 'POST',
                url: `${apiUrl}/inventory/products/${productRes.body.data.id}/variants`,
                headers,
                body: { name: VARIANT_NAME, code: VARIANT_CODE, uom_id: uom!.id },
              }).then((variantRes) => {
                cy.request({
                  method: 'POST',
                  url: `${apiUrl}/inventory/opening-balance`,
                  headers,
                  body: {
                    inventory_location_id: locationId,
                    item_variant_id: variantRes.body.data.id,
                    quantity: OPENING_QTY,
                    uom_id: uom!.id,
                    unit_cost: 3,
                  },
                })
              })
            })
          })
        })
      })
    })
  })
})

describe('Inventory Stock Movement ledger', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/inventario/movimientos')
    cy.contains('h1', 'Movimientos de Inventario', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('finds a seeded opening-balance movement through the ledger and inspects its evidence', () => {
    // The row is in the immutable history straight away.
    cy.contains('table tr', VARIANT_NAME, { timeout: 10_000 }).should('exist')

    // Narrow the ledger by the movement's reason — shareable filter state.
    cy.contains('label', 'Motivo:').parent().find('select').select('Saldo inicial')
    cy.location('search').should('contain', 'reason=OPENING_BALANCE')

    cy.contains('table tr', VARIANT_NAME)
      .should('contain.text', 'Entrada')
      .and('contain.text', 'Saldo inicial')
      .and('contain.text', LOCATION_NAME)
      .click()

    // Detail: the originating operation and the Location direction it moved stock in.
    cy.contains('h2', 'Detalle del movimiento', { timeout: 10_000 }).should('be.visible')
    cy.get('[data-testid="movement-quantity"]').should('contain.text', `${OPENING_QTY} kg`)
    cy.contains('p', 'Saldo inicial').should('exist')
    cy.contains('p', 'Movimiento manual').should('exist')
    cy.contains('Entrada').should('exist')
    cy.contains(LOCATION_NAME).should('exist')
  })
})
