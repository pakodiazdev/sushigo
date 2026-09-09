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

// Populated by the before() hook, consumed by the pagination test, which seeds Receipts straight
// through the API from these ids instead of re-deriving them from search endpoints — there is no
// `GET .../variants/purchase-presentations` route without a {variantId}, so the old lookup chain
// 404'd (#548).
const ids: {
  supplierId?: string
  locationId?: string
  presentationId?: string
} = {}

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
        // can_receive_purchases is an explicit persisted capability since #568/#572 — the
        // Receipt form only lists receiving locations, and the API rejects a draft aimed at
        // a non-receiving one, so it must be opted in here.
        body: {
          operating_unit_id: operatingUnit!.id,
          name: LOCATION_NAME,
          type: 'MAIN',
          can_receive_purchases: true,
        },
      }).then((locationResponse) => {
        ids.locationId = locationResponse.body.data.id as string
      })
    })

    cy.request({
      method: 'POST',
      url: `${apiUrl}/inventory/suppliers`,
      headers,
      body: { code: SUPPLIER_CODE, name: SUPPLIER_NAME },
    }).then((supplierResponse) => {
      ids.supplierId = supplierResponse.body.data.id as string
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
                }).then((presentationResponse) => {
                  ids.presentationId = presentationResponse.body.data.id as string
                })
              })
            })
          })
        })
      })
    })
  })
})

// The status pills ("Borrador" / "Confirmada" / "Revertida") also exist as <option>s in the
// list's status filter. cy.contains(<word>) matches that <option> first, and a native <option>
// reports 0x0 in Chrome — so `.should('be.visible')` on it fails (the flake #548 tracked).
// Scope status/detail assertions to the SlidePanel content instead.
const inDetailPanel = (fn: () => void) =>
  cy.contains('h2', 'Detalle de la recepción')
    .parents('.bg-background.shadow-xl')
    .first()
    .within(fn)

// Success toasts are fixed to the top-right for 5s and overlap the SlidePanel (a `position: fixed`
// subtree, so Cypress runs its "covered by another element" check even for a plain
// `.should('be.visible')` on the panel header/pill). Close every open toast and wait for it to
// unmount before asserting on the panel. Native element.click() (not cy.click) so a toast that
// auto-dismisses mid-iteration is a harmless no-op rather than a "detached element" error.
const dismissToasts = () => {
  cy.get('body').then(($body) => {
    $body
      .find('button[aria-label="Close notification"]')
      .each((_, button) => (button as HTMLElement).click())
  })
  cy.get('button[aria-label="Close notification"]').should('not.exist')
}

describe('Purchase Receipts', () => {
  beforeEach(() => {
    cy.loginByApi(email, password)
    cy.visitWithAuth('/inventario/recepciones-de-compra')
    cy.contains('h1', 'Recepciones de Compra', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('creates a draft receipt, posts it, and reverses it', () => {
    // No empty-list assertion here: a Cypress retry of this test re-runs against the Receipt the
    // failed attempt already created (before() does not re-run between attempts), so asserting an
    // empty list would make every retry fail on the leftover row. The beforeEach h1 check already
    // proves the page loaded. Same shape as stock-transfers.cy.ts.
    cy.contains('button', 'Nueva recepción').click()
    cy.contains('h2', 'Nueva recepción').should('be.visible')

    cy.get('select[aria-label="Proveedor"]').select(`${SUPPLIER_NAME} (${SUPPLIER_CODE})`)
    cy.get('select[aria-label="Almacén / ubicación receptora"]', { timeout: 10_000 }).select(LOCATION_NAME)
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
    dismissToasts()

    cy.contains('h2', 'Detalle de la recepción').should('be.visible')
    inDetailPanel(() => {
      cy.contains('Borrador').should('be.visible')
      cy.contains('Costo unitario efectivo: $20.00').should('be.visible')
    })

    cy.contains('button', 'Confirmar recepción').click()
    cy.get('[role="alertdialog"]').contains('button', 'Confirmar').click()
    cy.contains('Recepción confirmada', { timeout: 10_000 }).should('be.visible')
    dismissToasts()

    inDetailPanel(() => {
      cy.contains('Confirmada').should('be.visible')
      cy.contains('button', 'Editar').should('not.exist')
      cy.contains('no puede editarse').should('be.visible')
    })

    cy.contains('button', 'Revertir').click()
    cy.get('#reverse_reason').type('Recepción de prueba Cypress')
    cy.get('[role="alertdialog"]').contains('button', 'Revertir').click()
    cy.contains('Recepción revertida', { timeout: 10_000 }).should('be.visible')
    dismissToasts()

    inDetailPanel(() => {
      cy.contains('Revertida').should('be.visible')
      cy.contains('Recepción de prueba Cypress').should('be.visible')
    })
  })

  // #586 — the Receipt history list is server-side paginated (bounded page size 15).
  // Prove the operator can browse a Receipt that lives past page 1 without the UI
  // loading the whole dataset. Un-quarantines together with the rest of this spec
  // under #548.
  it('browses to a Purchase Receipt outside the first page', () => {
    // Unique per run so a duplicate reference can never confuse the assertions.
    const prefix = `PAG-${Date.now()}`
    const firstRef = `${prefix}-001`

    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/login`,
      body: { email, password },
    }).then((loginResponse) => {
      const headers = { Authorization: `Bearer ${loginResponse.body.data.token as string}` }

      expect(ids.supplierId, 'seeded supplier id').to.be.a('string')
      expect(ids.locationId, 'seeded location id').to.be.a('string')
      expect(ids.presentationId, 'seeded presentation id').to.be.a('string')

      // A Cypress retry (CI runs `retries=2`) re-enters this test without before() re-running.
      // Delete every DRAFT Receipt a prior attempt seeded first, so the row count — and which
      // page firstRef lands on — is identical on every attempt. (test:reset can't be used here:
      // it would also wipe the supplier/location/presentation the whole spec depends on.)
      cy.request({
        method: 'GET',
        // per_page is capped at 100 server-side; a larger value 302-redirects instead of 422ing.
        // 3 retries × 16 seeded + 1 from the first test never exceeds 100.
        url: `${apiUrl}/inventory/receipts?per_page=100`,
        headers: { ...headers, Accept: 'application/json' },
      }).then((listResponse) => {
        ;(listResponse.body.data as Array<{ id: string; status: string }>)
          .filter((receipt) => receipt.status === 'DRAFT')
          .forEach((receipt) => {
            cy.request({ method: 'DELETE', url: `${apiUrl}/inventory/receipts/${receipt.id}`, headers })
          })
      })

      // Seed 16 receipts so the default 15-per-page bound leaves one on page 2.
      Cypress._.times(16, (index) => {
        cy.request({
          method: 'POST',
          url: `${apiUrl}/inventory/receipts`,
          headers,
          body: {
            supplier_id: ids.supplierId,
            destination_location_id: ids.locationId,
            reference: `${prefix}-${String(index + 1).padStart(3, '0')}`,
            receipt_date: `2026-07-${String(index + 1).padStart(2, '0')}`,
            lines: [
              {
                variant_purchase_presentation_id: ids.presentationId,
                received_packages: 1,
                gross_amount: 100,
              },
            ],
          },
        })
      })
    })

    // Reload now that the history has rows, and dismiss the Dev Debugger the fresh load re-opens
    // (the beforeEach hook closed it before this test seeded anything).
    cy.visitWithAuth('/inventario/recepciones-de-compra')
    cy.contains('h1', 'Recepciones de Compra', { timeout: 10_000 }).should('be.visible')
    cy.get('table tbody tr', { timeout: 10_000 }).should('have.length', 15)
    cy.closeDevDebugger()

    // Bounded page: the list never renders more than one page's worth of rows, and the
    // oldest reference (…-001) is not on page 1 under receipt_date DESC ordering.
    cy.contains(firstRef).should('not.exist')

    // DataGrid renders one pagination <nav> per breakpoint; only the one for the current
    // viewport has layout boxes. Pick that one by its real width rather than `:visible`,
    // which Cypress also fails for an element scrolled below an overflow ancestor. The
    // `have.length` assertion makes the whole get+filter retry until the footer has laid out.
    cy.get('[aria-label="Página siguiente"]')
      .filter((_, el) => el.getBoundingClientRect().width > 0)
      .should('have.length', 1)
      .first()
      .scrollIntoView()
      .click()

    cy.contains(firstRef, { timeout: 10_000 }).should('be.visible').click()
    cy.contains('h2', 'Detalle de la recepción').should('be.visible')
    inDetailPanel(() => {
      cy.contains(firstRef).should('be.visible')
    })
  })
})
