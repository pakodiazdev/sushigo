/**
 * Purchase Receipt UI happy path (#433), against the Receipt/ReceiptLine backend from #432.
 *
 * Exercises the full DRAFT -> POSTED -> REVERSED lifecycle through the UI: create a draft
 * receiving a Box x24 presentation, confirm the live preview matches the backend's own formula
 * (net_acquisition_amount / base_units_received), post it (immutable evidence, inventory
 * applied), then reverse it. Validation/authorization/API contract edge cases belong to the
 * Vitest unit/component suites — this spec only covers the user-visible happy path.
 *
 * DB reset strategy
 * ─────────────────
 * test:reset (CoreTestSeeder) already seeds one Branch ("SushiGo Principal") with an
 * "Inventario Principal" Operating Unit and grants the admin user an active assignment to it
 * (see price-lists.cy.ts) — reused here to create the InventoryLocation this Receipt is
 * destined for, since InventoryLocation itself has no Testing-tier seed data yet.
 *
 * Run with: make cypress-devlab-spec SPEC=purchase-receipts
 */
import users from '../fixtures/users.json'

const { email, password } = users.admin
const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const OPERATING_UNIT_NAME = 'Inventario Principal'
const LOCATION_NAME = 'Cypress Bodega Central'
const SUPPLIER_NAME = 'Cypress Proveedor de Arroz'
const SUPPLIER_CODE = 'CYP-RECEIPT-SUP'
const CATEGORY_NAME = 'Cypress Insumos de Recepción'
const PRODUCT_NAME = 'Cypress Arroz para Recepción'
const VARIANT_NAME = 'Cypress Arroz 20 kg'
const VARIANT_CODE = 'CYP-RECEIPT-RICE-20KG'
const TEMPLATE_NAME = 'Cypress Caja x24'

// ⚠️ QUARANTINED per #490 → see #548. Fails against a fresh stack:
// Happy-path test fails: `expected '<option>' to be 'visible'` — a native <option> is never "visible" in Cypress; spec assertion bug.
// Remove this guard when #548 is fixed.
before(function () {
  this.skip()
})

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
        body: { operating_unit_id: operatingUnit!.id, name: LOCATION_NAME, type: 'MAIN' },
      })
    })

    cy.request({
      method: 'POST',
      url: `${apiUrl}/inventory/suppliers`,
      headers,
      body: { code: SUPPLIER_CODE, name: SUPPLIER_NAME },
    })

    cy.request({
      method: 'POST',
      url: `${apiUrl}/inventory-categories`,
      headers,
      body: { name: CATEGORY_NAME },
    }).then((categoryResponse) => {
      const categoryId = categoryResponse.body.data.id as string

      cy.request({
        method: 'POST',
        url: `${apiUrl}/units-of-measure`,
        headers,
        body: { code: 'CYPKG', name: 'Cypress Kilogram', symbol: 'kg' },
      }).then(() => {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/units-of-measure?per_page=100`,
          headers,
        }).then((uomsResponse) => {
          const uom = (uomsResponse.body.data as Array<{ id: string; code: string }>)
            .find((candidate) => candidate.code === 'CYPKG')
          expect(uom, 'prepared unit of measure').to.exist
          const uomId = uom!.id

          cy.request({
            method: 'POST',
            url: `${apiUrl}/inventory/purchase-presentation-templates`,
            headers,
            body: {
              code: 'CYP_RECEIPT_BOX_24',
              name: TEMPLATE_NAME,
              package_type: 'BOX',
              base_unit_quantity: 24,
              compatible_dimension_uom_id: uomId,
            },
          }).then((templateResponse) => {
            const templateId = templateResponse.body.data.id as string

            cy.request({
              method: 'POST',
              url: `${apiUrl}/inventory/products`,
              headers,
              body: { name: PRODUCT_NAME, inventory_category_id: categoryId },
            }).then((productResponse) => {
              const productId = productResponse.body.data.id as string

              cy.request({
                method: 'POST',
                url: `${apiUrl}/inventory/products/${productId}/variants`,
                headers,
                body: { name: VARIANT_NAME, code: VARIANT_CODE, uom_id: uomId },
              }).then((variantResponse) => {
                const variantId = variantResponse.body.data.id as string

                cy.request({
                  method: 'POST',
                  url: `${apiUrl}/inventory/products/${productId}/variants/${variantId}/purchase-presentations`,
                  headers,
                  body: { template_id: templateId },
                })
              })
            })
          })
        })
      })
    })
  })
})

describe('Purchase Receipts', () => {
  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/inventario/recepciones-de-compra')
    cy.contains('h1', 'Recepciones de Compra', { timeout: 10_000 }).should('be.visible')
    cy.contains('No data available', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('creates a draft receipt, posts it, and reverses it', () => {
    cy.contains('button', 'Nueva recepción').click()
    cy.contains('h2', 'Nueva recepción').should('be.visible')

    cy.get('select[aria-label="Proveedor"]').select(`${SUPPLIER_NAME} (${SUPPLIER_CODE})`)
    cy.get('select[aria-label="Ubicación destino"]', { timeout: 10_000 }).select(LOCATION_NAME)
    cy.get('input[aria-label="Fecha de recepción"]').type('2026-08-25')

    cy.get('select[aria-label="Producto línea 1"]').select(PRODUCT_NAME)
    cy.get('select[aria-label="Variante línea 1"]', { timeout: 10_000 })
      .should('not.be.disabled')
      .select(`${VARIANT_NAME} (${VARIANT_CODE})`)
    cy.get('select[aria-label="Presentación de compra línea 1"]', { timeout: 10_000 })
      .should('not.be.disabled')
      .select(`${TEMPLATE_NAME} (x24)`)

    cy.get('input[aria-label="Paquetes recibidos línea 1"]').clear().type('10')
    cy.get('input[aria-label="Monto bruto línea 1"]').clear().type('4800')

    cy.contains('Costo unitario efectivo: $20.00').should('be.visible')

    cy.contains('button', 'Crear recepción').click()
    cy.contains('Recepción creada', { timeout: 10_000 }).should('be.visible')

    cy.contains('h2', 'Detalle de la recepción').should('be.visible')
    cy.contains('Borrador').should('be.visible')
    cy.contains('Costo unitario efectivo: $20.00').should('be.visible')

    cy.contains('button', 'Confirmar recepción').click()
    cy.get('[role="alertdialog"]').contains('button', 'Confirmar').click()
    cy.contains('Recepción confirmada', { timeout: 10_000 }).should('be.visible')

    cy.contains('Confirmada').should('be.visible')
    cy.contains('button', 'Editar').should('not.exist')
    cy.contains('no puede editarse').should('be.visible')

    cy.contains('button', 'Revertir').click()
    cy.get('#reverse_reason').type('Recepción de prueba Cypress')
    cy.get('[role="alertdialog"]').contains('button', 'Revertir').click()
    cy.contains('Recepción revertida', { timeout: 10_000 }).should('be.visible')

    cy.contains('Revertida').should('be.visible')
    cy.contains('Recepción de prueba Cypress').should('be.visible')
  })

  // #586 — the Receipt history list is server-side paginated (bounded page size 15).
  // Prove the operator can browse a Receipt that lives past page 1 without the UI
  // loading the whole dataset. Un-quarantines together with the rest of this spec
  // under #548.
  it('browses to a Purchase Receipt outside the first page', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/login`,
      body: { email, password },
    }).then((loginResponse) => {
      const headers = { Authorization: `Bearer ${loginResponse.body.data.token as string}` }

      cy.request({
        method: 'GET',
        url: `${apiUrl}/inventory/suppliers?search=${encodeURIComponent(SUPPLIER_NAME)}`,
        headers,
      }).then((suppliersResponse) => {
        const supplierId = (suppliersResponse.body.data as Array<{ id: string; name: string }>)
          .find((candidate) => candidate.name === SUPPLIER_NAME)!.id

        cy.request({
          method: 'GET',
          url: `${apiUrl}/inventory-locations?search=${encodeURIComponent(LOCATION_NAME)}`,
          headers,
        }).then((locationsResponse) => {
          const locationId = (locationsResponse.body.data as Array<{ id: string; name: string }>)
            .find((candidate) => candidate.name === LOCATION_NAME)!.id

          cy.request({
            method: 'GET',
            url: `${apiUrl}/inventory/products?search=${encodeURIComponent(PRODUCT_NAME)}`,
            headers,
          }).then((productsResponse) => {
            const productId = (productsResponse.body.data as Array<{ id: string; name: string }>)
              .find((candidate) => candidate.name === PRODUCT_NAME)!.id

            cy.request({
              method: 'GET',
              url: `${apiUrl}/inventory/products/${productId}/variants/purchase-presentations`,
              headers,
            }).then((presentationsResponse) => {
              const presentationId = (presentationsResponse.body.data as Array<{ id: string }>)[0].id

              // Seed 16 receipts so the default 15-per-page bound leaves one on page 2.
              Cypress._.times(16, (index) => {
                cy.request({
                  method: 'POST',
                  url: `${apiUrl}/inventory/receipts`,
                  headers,
                  body: {
                    supplier_id: supplierId,
                    destination_location_id: locationId,
                    reference: `PAGINATION-${String(index + 1).padStart(3, '0')}`,
                    receipt_date: `2026-07-${String(index + 1).padStart(2, '0')}`,
                    lines: [
                      {
                        variant_purchase_presentation_id: presentationId,
                        received_packages: 1,
                        gross_amount: 100,
                      },
                    ],
                  },
                })
              })
            })
          })
        })
      })
    })

    cy.visitWithAuth('/inventario/recepciones-de-compra')
    cy.contains('h1', 'Recepciones de Compra', { timeout: 10_000 }).should('be.visible')

    // Bounded page: exactly 15 rows, and the oldest reference (PAGINATION-001) is not
    // on page 1 under receipt_date DESC ordering.
    cy.get('table tbody tr').should('have.length', 15)
    cy.contains('PAGINATION-001').should('not.exist')

    cy.get('nav[aria-label], [aria-label="Página siguiente"]').first().should('exist')
    cy.get('[aria-label="Página siguiente"]').click()

    cy.contains('PAGINATION-001', { timeout: 10_000 }).should('be.visible').click()
    cy.contains('h2', 'Detalle de la recepción').should('be.visible')
    cy.contains('PAGINATION-001').should('be.visible')
  })
})
