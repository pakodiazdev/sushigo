/**
 * Managed-Variant assignments per Inventory Location — happy path (#569)
 *
 * `VariantLocationAssignment` is the managed assortment per Location, its own source of truth,
 * independent of physical Stock and of replenishment thresholds. This exercises the focused
 * assignment panel where the issue puts it — the Inventory Location detail workflow
 * (`/inventario/ubicaciones` → open a Location) — end to end: pick an unassigned Variant, assign
 * it (which must not create any Stock), see it flip to "Managed here", then unassign it while it
 * still has zero Stock.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', null) (core only) — seeds one Branch with three Operating
 *   Units including "Inventario Principal" plus the admin user. It does NOT seed an Inventory
 *   Location, a UOM, a Product or any Stock, so those are created here via the API, mirroring
 *   replenishment-thresholds.cy.ts / price-lists.cy.ts.
 *
 * Run just this file:
 *   make cypress-spec SPEC=variant-location-assignments
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const OPERATING_UNIT_NAME = 'Inventario Principal'
const LOCATION_NAME = 'Cypress Assortment Store'
const LOCATION_TYPE = 'MAIN'

const CATEGORY_NAME = 'Cypress Assortment Beverages'
const PRODUCT_NAME = 'Cypress Assortment Rice'
const VARIANT_NAME = 'Cypress Assortment Rice 1kg'
const VARIANT_CODE = 'CYP-ASG-RICE-KG'

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
        }).then(() => {
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

describe('Managed-Variant assignments (Inventory Location detail)', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/inventario/ubicaciones')
    cy.contains('h1', 'Ubicaciones de Inventario', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('assigns and then unassigns a Variant without ever creating Stock', () => {
    // Open the Location detail panel.
    cy.contains('td', LOCATION_NAME, { timeout: 10_000 }).click()

    cy.get('[data-testid="variant-assignments-panel"]', { timeout: 10_000 })
      .scrollIntoView()
      .within(() => {
        cy.contains('h3', 'Managed variants').should('be.visible')

        // The catalog Variant starts unassigned.
        cy.contains('button', 'Unassigned').click()
        cy.get('input[placeholder*="Search by code"]').clear().type(VARIANT_CODE)

        cy.get(`[data-testid="variant-assignment-row-${VARIANT_CODE}"]`, { timeout: 10_000 })
          .should('contain.text', 'Not managed')
          .within(() => cy.contains('button', 'Assign').click())
      })

    cy.contains('Variant assigned to this location', { timeout: 10_000 }).should('be.visible')

    // It now shows under the assigned slice, and can be unassigned (zero Stock).
    cy.get('[data-testid="variant-assignments-panel"]').within(() => {
      cy.contains('button', 'Assigned').click()
      cy.get('input[placeholder*="Search by code"]').clear().type(VARIANT_CODE)

      cy.get(`[data-testid="variant-assignment-row-${VARIANT_CODE}"]`, { timeout: 10_000 })
        .should('contain.text', 'Managed here')
        .within(() => cy.contains('button', 'Unassign').click())
    })

    cy.contains('Variant unassigned from this location', { timeout: 10_000 }).should('be.visible')
  })
})
