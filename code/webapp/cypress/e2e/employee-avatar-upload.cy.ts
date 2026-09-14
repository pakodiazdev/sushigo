/**
 * Employee Avatar Upload — E2E happy path (#401)
 *
 * An administrator uploads an avatar while creating an employee, then sees
 * the uploaded photo (not the initials fallback) rendered in the employee
 * detail header after save.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=employee-avatar-upload
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

// Regenerated in beforeEach (not module scope) so a Cypress `retries` rerun — CI runs
// `cypress run --config retries=2` (see .github/workflows/_e2e-ci.yml) — gets a fresh identity
// instead of resubmitting the one a prior attempt already persisted. The suite-level `before()`
// above only resets the database once for the whole file, not per retry: without this, a first
// attempt that creates the employee and then fails during the avatar assertions would leave a
// retry's identical email colliding on `unique:users,email`, and the unscoped name/avatar-alt
// assertions below could then match the leftover employee from the first attempt and falsely
// pass (same hazard already documented for item-media-gallery-uploader.cy.ts's SKU and
// product-variant-purchase-presentation.cy.ts:137-141 — Codex review finding).
let lastName = ''

describe('Empleados — Avatar', () => {
  beforeEach(() => {
    lastName = `Cypress${Date.now()}`
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('admin uploads an employee avatar and sees it after save', () => {
    // ── 1. Abrir formulario de creación ──────────────────────────────────────
    cy.contains('button', 'Nuevo Empleado').click()

    // ── 2. Subir foto de avatar via MediaGalleryUploader ─────────────────────
    cy.get('[data-testid="media-uploader-input"]').selectFile('cypress/fixtures/media/sample-photo.jpg', {
      force: true,
    })
    cy.get('[data-testid="media-uploader-asset"]', { timeout: 15_000 }).should('have.length', 1)

    // ── 3. Llenar datos básicos ───────────────────────────────────────────────
    cy.get('input[name="first_name"]').type('Avatar', { force: true })
    cy.get('input[name="last_name"]').type(lastName, { force: true })
    cy.contains('label', 'Cocinero').find('[role="switch"]').click({ force: true })
    cy.get('input[name="email"]').type(`avatar.${lastName.toLowerCase()}@sushigo.com`, { force: true })

    // ── 4. Crear empleado ─────────────────────────────────────────────────────
    // "Crear" is disabled (isSubmitDisabled) while MediaGalleryUploader reports itself busy —
    // onBusyChange(false) only fires from an effect that runs a render *after* the thumbnail
    // mounts (see media-gallery-uploader.tsx), so clicking the instant the thumbnail appears
    // can race that still-disabled window and silently drop the submit (same root cause fixed
    // for item-media-gallery-uploader.cy.ts in #545). Assert the button is actually enabled
    // first — `{ force: true }` on the click itself still applies, same as employees.cy.ts's
    // own "Crear empleado" test for this identical button: this form is long enough that the
    // SlidePanel's footer sits right at the scroll boundary, so the plain actionability check
    // (not the disabled state) can still report it as clipped even once enabled.
    cy.contains('button', 'Crear').scrollIntoView().should('not.be.disabled').click({ force: true })

    // ── 5. Verificar que el avatar subido se muestra en el detalle ───────────
    // Same pattern as employees.cy.ts's "Crear empleado" test: scrollIntoView first —
    // the SlidePanel's autoScrollOnFocus can still be settling, and the employee list
    // row behind the panel would otherwise be an ambiguous (clipped) match too.
    cy.contains(`Avatar ${lastName}`, { timeout: 10_000 }).scrollIntoView().should('be.visible')
    // An <img> inside the accessible avatar wrapper means the uploaded photo
    // rendered — not the initials fallback (which renders a <span> instead).
    cy.get(`[role="img"][aria-label="Avatar ${lastName}"]`, { timeout: 10_000 })
      .find('img')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('not.be.empty')
  })
})
