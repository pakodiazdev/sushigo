/**
 * Inventory Location purchase-receiving capability — E2E happy path (#568).
 *
 * Exercises the user-visible "read and change the capability" flow: an
 * authorized user opens a Location whose `can_receive_purchases` is off, sees
 * it reflected as "No" in the detail panel, edits the Location to turn the
 * capability on through the form checkbox, and sees the detail panel update to
 * "Sí". Validation, authorization, API scoping, and the migration backfill are
 * covered by PHPUnit/Vitest, not here.
 *
 * DB reset strategy
 * ─────────────────
 * test:reset (CoreTestSeeder) seeds one Branch with an "Inventario Principal"
 * Operating Unit and grants the admin user an active assignment to it.
 * InventoryLocation has no Testing-tier seed, so the target Location is created
 * via the API in before() — same pattern as purchase-receipts.cy.ts.
 *
 * Run with: make cypress-run SPEC=cypress/e2e/inventory-location-receiving-capability.cy.ts
 */
import users from '../fixtures/users.json'

const { email, password } = users.admin
const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const OPERATING_UNIT_NAME = 'Inventario Principal'
const LOCATION_NAME = `Cypress Andén de Recepción ${Date.now()}`

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })

  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/login`,
    body: { email, password },
  }).then((loginResponse) => {
    const headers = { Authorization: `Bearer ${loginResponse.body.data.token as string}` }

    cy.request({
      method: 'GET',
      url: `${apiUrl}/operating-units?search=${encodeURIComponent(OPERATING_UNIT_NAME)}`,
      headers,
    }).then((operatingUnitsResponse) => {
      const operatingUnit = (operatingUnitsResponse.body.data as Array<{ id: number; name: string }>)
        .find((candidate) => candidate.name === OPERATING_UNIT_NAME)
      expect(operatingUnit, 'seeded operating unit').to.exist

      cy.request({
        method: 'POST',
        url: `${apiUrl}/inventory-locations`,
        headers,
        body: {
          operating_unit_id: operatingUnit!.id,
          name: LOCATION_NAME,
          type: 'MAIN',
          can_receive_purchases: false,
        },
      }).then((locationResponse) => {
        // The API defaults the capability to false when not opted in.
        expect(locationResponse.body.data.can_receive_purchases).to.eq(false)
      })
    })
  })
})

describe('Inventory Location — purchase-receiving capability', () => {
  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/inventario/ubicaciones')
    cy.contains('h1', 'Ubicaciones de Inventario', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  const capabilityRow = () => cy.contains('p', 'Puede recibir compras').parent()

  it('reads the capability in the detail panel and toggles it through the form', () => {
    // ── Read: the seeded Location cannot receive purchases yet ────────────────
    cy.contains(LOCATION_NAME, { timeout: 10_000 }).click()
    cy.contains('h2', 'Detalle de Ubicación').should('be.visible')
    capabilityRow().within(() => {
      cy.contains('No').should('be.visible')
    })

    // ── Change: enable the capability from the edit form ─────────────────────
    cy.contains('button', 'Edit Location').click()
    cy.contains('h2', 'Editar Ubicación').should('be.visible')
    cy.contains(/destino de una recepción de compra/i).should('be.visible')
    cy.contains('label', 'Puede recibir compras')
      .parent()
      .find('input[type="checkbox"]')
      .check()
    cy.contains('button', 'Actualizar Ubicación').click()
    cy.contains('Ubicación Actualizada', { timeout: 10_000 }).should('be.visible')

    // ── Read again: the detail panel now reflects the enabled capability ─────
    cy.contains(LOCATION_NAME, { timeout: 10_000 }).click()
    cy.contains('h2', 'Detalle de Ubicación').should('be.visible')
    capabilityRow().within(() => {
      cy.contains('Sí').should('be.visible')
    })
  })
})
