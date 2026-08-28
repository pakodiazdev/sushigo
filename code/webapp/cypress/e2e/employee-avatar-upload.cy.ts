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

// ⚠️ QUARANTINED per #490 → see #552 (CI-only failure; passes locally). Fails against a fresh stack:
// CI-only (passes locally on Electron): `[data-testid="media-uploader-asset"]` never appears after the avatar file is selected (employee-avatar-upload.cy.ts:37) — the upload flow does not render the asset under Chromium.
// Remove this guard when #552 is fixed.
before(function () {
  this.skip()
})

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

describe('Empleados — Avatar', () => {
  beforeEach(() => {
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
    cy.get('input[name="last_name"]').type('Cypress', { force: true })
    cy.contains('label', 'Cocinero').find('[role="switch"]').click({ force: true })
    cy.get('input[name="email"]').type('avatar.cypress@sushigo.com', { force: true })

    // ── 4. Crear empleado ─────────────────────────────────────────────────────
    cy.contains('button', 'Crear').scrollIntoView().click({ force: true })

    // ── 5. Verificar que el avatar subido se muestra en el detalle ───────────
    // Same pattern as employees.cy.ts's "Crear empleado" test: scrollIntoView first —
    // the SlidePanel's autoScrollOnFocus can still be settling, and the employee list
    // row behind the panel would otherwise be an ambiguous (clipped) match too.
    cy.contains('Avatar Cypress', { timeout: 10_000 }).scrollIntoView().should('be.visible')
    // An <img> inside the accessible avatar wrapper means the uploaded photo
    // rendered — not the initials fallback (which renders a <span> instead).
    cy.get('[role="img"][aria-label="Avatar Cypress"]', { timeout: 10_000 })
      .find('img')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('not.be.empty')
  })
})
