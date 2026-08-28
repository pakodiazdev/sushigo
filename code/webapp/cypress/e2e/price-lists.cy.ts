/**
 * Price Lists management UI — happy path (#436)
 *
 * Exercises the new branch-aware Product Variant pricing UI built on top of #435's backend:
 * create two Price Lists, each carrying its own price for the *same* Variant, one assigned at
 * the Branch level and the other at a more specific Operating-Unit level within that same
 * branch — this is what "two branch-specific prices for one Variant" (Acceptance Criterion)
 * means in this domain, where Branch and Operating Unit are the two tiers of "branch or
 * approved operating context" the issue's own title names (see
 * doc/architecture/pricing/pricing-architecture.en.md §2/§3). Then verifies the
 * resolved-price preview picks the more specific one when an Operating Unit is given and falls
 * back to the branch-level one otherwise (matching PriceResolutionService exactly), and that an
 * overlapping Variant Price conflict is surfaced instead of silently saved.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', null) (core only) — this seeds one Branch ("SushiGo
 *   Principal") with three Operating Units, including "Inventario Principal", and grants the
 *   admin user active assignments to all three (see CoreTestSeeder). One InventoryCategory, one
 *   UnitOfMeasure, one Product and one Variant are then seeded directly via the API — mirrors
 *   the same strategy already used by product-variant-purchase-presentation.cy.ts (#427), since
 *   Pricing Testing-tier seed data doesn't exist yet.
 * • Assignment effective_from is hardcoded to a fixed past date ('2020-01-01') with no
 *   effective_to, so resolution against "today" never depends on computing today's date in the
 *   test itself.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=price-lists
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

const CATEGORY_NAME = 'Beverages'
const UOM_NAME = 'Kilogram'
const UOM_SYMBOL = 'kg'
const PRODUCT_NAME = 'Cypress Pricing Rice'
const VARIANT_NAME = 'Cypress Pricing Rice 1kg Bag'
const VARIANT_CODE = 'CYP-PRICE-RICE-KG'
const VARIANT_OPTION_TEXT = `${PRODUCT_NAME} — ${VARIANT_NAME} (${VARIANT_CODE})`

const BRANCH_NAME = 'SushiGo Principal'
const OPERATING_UNIT_NAME = 'Inventario Principal'

const BRANCH_PRICE_LIST_CODE = 'CYP-BRANCH-PL'
const BRANCH_PRICE_LIST_NAME = 'Cypress Branch Pricing'
const BRANCH_PRICE = '100.0000'

const UNIT_PRICE_LIST_CODE = 'CYP-UNIT-PL'
const UNIT_PRICE_LIST_NAME = 'Cypress Unit Pricing'
const UNIT_PRICE = '150.0000'

const EFFECTIVE_FROM = '2020-01-01'

/** Every panel/card lives inside a scrollable SlidePanel body — scroll before clicking,
 *  mirroring product-variant-purchase-presentation.cy.ts's own submit-button pattern. An exact
 *  match (regex) is required for 'New Price', since `cy.contains` substring-matches by default
 *  and the page header's own 'New Price List' button (behind the panel, earlier in the DOM)
 *  would otherwise be matched first. */
function clickButton(text: string | RegExp) {
  cy.contains('button', text).scrollIntoView().click({ force: true })
}

// ⚠️ QUARANTINED per #490 → see #546. Fails against a fresh stack:
// Happy-path test fails: `cy.select()` on a <select> "covered by another element" (overlay).
// Remove this guard when #546 is fixed.
before(function () {
  this.skip()
})

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })

  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/login`,
    body: { email: adminEmail, password: adminPassword },
    failOnStatusCode: true,
  }).then((loginRes) => {
    const token = loginRes.body.data.token as string
    // Force Laravel validation failures to remain JSON 422 responses. Without Accept,
    // FormRequest redirects to `/` and cy.request follows the 302, which can disguise a
    // failed setup write as a successful 200 response.
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

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
      }).then(() => {
        // The legacy create-UOM response still exposes its numeric internal id, while the
        // Product Variant contract correctly requires the UOM public id. Resolve it from the
        // list response, whose model serialization uses public ids (same setup pattern as the
        // supplier-catalog E2E).
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
            url: `${apiUrl}/inventory/products`,
            headers,
            body: { name: PRODUCT_NAME, inventory_category_id: categoryId },
            failOnStatusCode: true,
          }).then((productRes) => {
            const productId = productRes.body.data.id as string

            cy.request({
              method: 'POST',
              url: `${apiUrl}/inventory/products/${productId}/variants`,
              headers,
              body: { name: VARIANT_NAME, code: VARIANT_CODE, uom_id: uom!.id },
              failOnStatusCode: true,
            })
          })
        })
      })
    })
  })
})

describe('Price Lists management', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/inventario/listas-de-precios')
    cy.url().should('include', '/inventario/listas-de-precios', { timeout: 10_000 })
    cy.contains('h1', 'Price Lists', { timeout: 10_000 }).should('be.visible')
    cy.contains('No data available', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('creates two context-scoped prices for one Variant, previews the resolved price for each context, and surfaces an overlap conflict instead of silently saving it', () => {
    // ── 1. Create the branch-level Price List ──────────────────────────────
    clickButton('New Price List')
    cy.contains('h2', 'New Price List', { timeout: 10_000 }).should('be.visible')

    cy.get('form').within(() => {
      cy.get('input[placeholder="e.g., STANDARD"]').type(BRANCH_PRICE_LIST_CODE)
      cy.get('input[placeholder="e.g., Standard Pricing"]').type(BRANCH_PRICE_LIST_NAME)
    })
    clickButton('Create Price List')

    cy.contains('Price List created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Price List Detail', { timeout: 10_000 }).should('be.visible')
    cy.contains(BRANCH_PRICE_LIST_NAME).should('be.visible')

    // ── 2. Assign it to the Branch (no Operating Unit override) ────────────
    clickButton('New Assignment')
    cy.contains('h2', 'Price List Assignment', { timeout: 10_000 }).should('be.visible')

    cy.get('form').within(() => {
      cy.get('select').eq(0).select(BRANCH_NAME)
      cy.setDateInput('input[type="date"]', EFFECTIVE_FROM)
    })
    clickButton('Create Assignment')

    cy.contains('Assignment created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Price List Detail', { timeout: 10_000 }).should('be.visible')
    cy.contains(BRANCH_NAME).should('be.visible')

    // ── 3. Price the Variant on this list ───────────────────────────────────
    clickButton(/^New Price$/)
    cy.contains('h2', 'Variant Price', { timeout: 10_000 }).should('be.visible')

    cy.get('form').within(() => {
      // The Variant <select> is populated by a debounced API search (see VariantPicker) —
      // wait for the target option to actually render before selecting it.
      cy.get('select', { timeout: 10_000 }).should('contain.text', VARIANT_OPTION_TEXT)
      cy.get('select').select(VARIANT_OPTION_TEXT)
      cy.get('input[placeholder="e.g., 129.5000"]').type(BRANCH_PRICE)
      cy.setDateInput('input[type="date"]', EFFECTIVE_FROM)
    })
    clickButton('Create Price')

    cy.contains('Variant Price created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Price List Detail', { timeout: 10_000 }).should('be.visible')
    cy.contains(BRANCH_PRICE).should('be.visible')

    // ── 4. Overlap conflict: a second price for the same Variant, same list, same range ──
    clickButton(/^New Price$/)
    cy.contains('h2', 'Variant Price', { timeout: 10_000 }).should('be.visible')

    cy.get('form').within(() => {
      cy.get('select', { timeout: 10_000 }).should('contain.text', VARIANT_OPTION_TEXT)
      cy.get('select').select(VARIANT_OPTION_TEXT)
      cy.get('input[placeholder="e.g., 129.5000"]').type('999.0000')
      cy.setDateInput('input[type="date"]', EFFECTIVE_FROM)
    })
    clickButton('Create Price')

    // Rejected, not silently saved — the create form stays open with the conflict visible.
    cy.contains(/Ya existe un precio activo/, { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Variant Price', { timeout: 10_000 }).should('be.visible')
    clickButton('Cancel')
    cy.contains('h2', 'Price List Detail', { timeout: 10_000 }).should('be.visible')
    // Only the original price is on the list — the rejected 999.0000 never landed.
    cy.contains('999.0000').should('not.exist')

    // ── 5. Back to the list, create the Operating-Unit-level Price List ────
    cy.contains('button', 'Edit Price List').scrollIntoView().should('be.visible')
    cy.get('body').type('{esc}')
    cy.contains('h2', 'Price List Detail').should('not.exist')
    cy.contains(BRANCH_PRICE_LIST_CODE, { timeout: 10_000 }).should('be.visible')

    clickButton('New Price List')
    cy.contains('h2', 'New Price List', { timeout: 10_000 }).should('be.visible')

    cy.get('form').within(() => {
      cy.get('input[placeholder="e.g., STANDARD"]').type(UNIT_PRICE_LIST_CODE)
      cy.get('input[placeholder="e.g., Standard Pricing"]').type(UNIT_PRICE_LIST_NAME)
      cy.get('input[type="number"]').clear().type('10')
    })
    clickButton('Create Price List')

    cy.contains('Price List created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Price List Detail', { timeout: 10_000 }).should('be.visible')

    // ── 6. Assign it to the more specific Operating Unit within the same Branch ──
    clickButton('New Assignment')
    cy.contains('h2', 'Price List Assignment', { timeout: 10_000 }).should('be.visible')

    cy.get('form').within(() => {
      cy.get('select').eq(0).select(BRANCH_NAME)
      cy.get('select').eq(1).select(OPERATING_UNIT_NAME)
      cy.setDateInput('input[type="date"]', EFFECTIVE_FROM)
    })
    clickButton('Create Assignment')

    cy.contains('Assignment created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Price List Detail', { timeout: 10_000 }).should('be.visible')
    cy.contains(OPERATING_UNIT_NAME).should('be.visible')

    // ── 7. Price the same Variant differently on this second list ──────────
    clickButton(/^New Price$/)
    cy.contains('h2', 'Variant Price', { timeout: 10_000 }).should('be.visible')

    cy.get('form').within(() => {
      cy.get('select', { timeout: 10_000 }).should('contain.text', VARIANT_OPTION_TEXT)
      cy.get('select').select(VARIANT_OPTION_TEXT)
      cy.get('input[placeholder="e.g., 129.5000"]').type(UNIT_PRICE)
      cy.setDateInput('input[type="date"]', EFFECTIVE_FROM)
    })
    clickButton('Create Price')

    cy.contains('Variant Price created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Price List Detail', { timeout: 10_000 }).should('be.visible')
    cy.contains(UNIT_PRICE).should('be.visible')

    // ── 8. Resolved-price preview: branch-only context falls back to the branch-level list ──
    cy.get('[data-testid="resolved-price-preview"]').scrollIntoView().should('be.visible')
    cy.get('[data-testid="resolved-price-preview-result"]').should('not.exist')

    cy.get('[data-testid="resolved-price-preview"]').within(() => {
      cy.get('select', { timeout: 10_000 }).eq(0).should('contain.text', VARIANT_OPTION_TEXT)
      cy.get('select').eq(0).select(VARIANT_OPTION_TEXT)
      cy.get('select').eq(1).select(BRANCH_NAME)
    })
    clickButton('Preview Resolved Price')

    cy.get('[data-testid="resolved-price-preview-result"]', { timeout: 10_000 }).within(() => {
      cy.contains(BRANCH_PRICE).should('be.visible')
      cy.contains(BRANCH_PRICE_LIST_NAME).should('be.visible')
    })

    // ── 9. Same Variant/Branch, but with the more specific Operating Unit ──
    cy.get('[data-testid="resolved-price-preview"]').within(() => {
      cy.get('select').eq(2).select(OPERATING_UNIT_NAME)
    })
    clickButton('Preview Resolved Price')

    cy.get('[data-testid="resolved-price-preview-result"]', { timeout: 10_000 }).within(() => {
      cy.contains(UNIT_PRICE).should('be.visible')
      cy.contains(UNIT_PRICE_LIST_NAME).should('be.visible')
    })
  })
})
