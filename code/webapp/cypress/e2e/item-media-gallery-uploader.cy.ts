/**
 * Item Media Gallery Uploader — E2E happy path (#378)
 *
 * Exercises the reusable <MediaGalleryUploader /> wired into the Item
 * ("Item Rápido") form: upload a photo before the item is saved, mark it
 * primary, then save the item and confirm the upload flow completed
 * end-to-end (upload-first / attach-on-save, see #377).
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=item-media-gallery-uploader
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

// Regenerated in beforeEach (not module scope) so a Cypress `retries` rerun — which reruns
// beforeEach but not the suite-level before() — gets a fresh SKU instead of resubmitting the
// one the prior attempt already persisted (CI runs `cypress run --config retries=2`, see
// .github/workflows/_e2e-ci.yml:329; same hazard documented in
// product-variant-purchase-presentation.cy.ts:137-141).
let sku = ''

describe('Item Rápido — Media Gallery Uploader', () => {
  beforeEach(() => {
    sku = `CYP-MEDIA-${Date.now()}`
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/inventario/insumos')
    cy.url().should('include', '/inventario/insumos', { timeout: 10_000 })
    // A fresh `test:reset` (core only) leaves the items list empty, so the
    // DataGrid renders its "Aún no hay registros" empty state instead of a <table> —
    // wait for the quick-create button instead, which is always present.
    cy.contains('button', 'Item Rápido', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('uploads a photo, marks it primary, and creates the item with the gallery attached', () => {
    // ── 1. Open the quick-create form ──────────────────────────────────────
    cy.contains('button', 'Item Rápido').click()

    // ── 2. Fill in the basic item fields ─────────────────────────────────
    cy.get('input[placeholder="e.g., SAL-001"]').type(sku, { force: true })
    cy.get('input[placeholder="e.g., Fresh Salmon"]').type('Cypress Media Item', { force: true })

    // ── 3. Upload a photo via the MediaGalleryUploader ───────────────────
    cy.get('[data-testid="media-uploader-input"]').selectFile('cypress/fixtures/media/sample-photo.jpg', {
      force: true,
    })

    // The upload is async (hits POST /media/upload) — wait for the thumbnail.
    cy.get('[data-testid="media-uploader-asset"]', { timeout: 15_000 }).should('have.length', 1)
    cy.contains('Primary').should('be.visible')

    // ── 4. Save the item ──────────────────────────────────────────────────
    // "Create Item" is disabled (isSubmitDisabled) while MediaGalleryUploader reports itself
    // busy. onBusyChange(false) only fires from an effect that runs a render *after* the
    // thumbnail + "Primary" badge mount, so clicking the instant the badge shows raced that
    // still-disabled window — onSubmit's `if (isSubmitDisabled) return` guard then silently
    // dropped the submit (no POST /items, "Item created successfully" never appeared). Assert
    // the button is actually enabled and let Cypress's own actionability retry wait it out.
    cy.contains('button', 'Create Item').scrollIntoView().should('not.be.disabled').click()

    // ── 5. Confirm the item was created ───────────────────────────────────
    cy.contains('Item created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains(sku, { timeout: 10_000 }).should('be.visible')
  })
})
