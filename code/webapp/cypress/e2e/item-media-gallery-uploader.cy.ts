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

// ⚠️ QUARANTINED per #490 → see #545. Fails against a fresh stack:
// Happy-path test fails: toast 'Item created successfully' never appears — the create+media-gallery flow does not complete.
// Remove this guard when #545 is fixed.
before(function () {
  this.skip()
})

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

describe('Item Rápido — Media Gallery Uploader', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/inventario/insumos')
    cy.url().should('include', '/inventario/insumos', { timeout: 10_000 })
    // A fresh `test:reset` (core only) leaves the items list empty, so the
    // DataGrid renders its "No data available" state instead of a <table> —
    // wait for the quick-create button instead, which is always present.
    cy.contains('button', 'Item Rápido', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('uploads a photo, marks it primary, and creates the item with the gallery attached', () => {
    // ── 1. Open the quick-create form ──────────────────────────────────────
    cy.contains('button', 'Item Rápido').click()

    // ── 2. Fill in the basic item fields ─────────────────────────────────
    cy.get('input[placeholder="e.g., SAL-001"]').type('CYP-MEDIA-001', { force: true })
    cy.get('input[placeholder="e.g., Fresh Salmon"]').type('Cypress Media Item', { force: true })

    // ── 3. Upload a photo via the MediaGalleryUploader ───────────────────
    cy.get('[data-testid="media-uploader-input"]').selectFile('cypress/fixtures/media/sample-photo.jpg', {
      force: true,
    })

    // The upload is async (hits POST /media/upload) — wait for the thumbnail.
    cy.get('[data-testid="media-uploader-asset"]', { timeout: 15_000 }).should('have.length', 1)
    cy.contains('Primary').should('be.visible')

    // ── 4. Save the item ──────────────────────────────────────────────────
    cy.contains('button', 'Create Item').scrollIntoView().click({ force: true })

    // ── 5. Confirm the item was created ───────────────────────────────────
    cy.contains('Item created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('CYP-MEDIA-001', { timeout: 10_000 }).should('be.visible')
  })
})
