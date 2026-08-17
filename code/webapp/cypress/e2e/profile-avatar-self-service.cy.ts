/**
 * Self-Service Avatar — E2E happy path (#420)
 *
 * A non-admin user (no users.update) picks a new avatar photo from the /perfil
 * page, crops it in the circular preview, saves it, and immediately sees it in
 * the application header — without signing out and back in.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=profile-avatar-self-service
 */

import users from '../fixtures/users.json'

const { email: managerEmail, password: managerPassword, expectedName } = users.manager

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

describe('Perfil — Avatar self-service', () => {
  beforeEach(() => {
    cy.login(managerEmail, managerPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.closeDevDebugger()
  })

  it('a non-admin user crops and saves their own avatar and sees it in the header without re-login', () => {
    // Header.tsx renders two Avatar instances for the same user (mobile + desktop
    // menus, toggled by CSS media query, not conditional rendering) — at the
    // 1280px default Cypress viewport only the desktop one (`.lg:flex`) is
    // actually visible, so every assertion below is scoped to it specifically
    // rather than picking whichever the mobile-first DOM order happens to match.
    const headerAvatarSelector = '.lg\\:flex [role="img"][aria-label="' + expectedName + '"] img'
    const headerAvatarImg = (options?: Partial<Cypress.Timeoutable>) => cy.get(headerAvatarSelector, options)

    // ── 1. Only the initials fallback renders before any avatar is attached ──
    headerAvatarImg().should('not.exist')

    // ── 2. Ir a Mi perfil y elegir foto ───────────────────────────────────────
    cy.visit('/perfil')
    cy.url().should('include', '/perfil', { timeout: 10_000 })

    cy.get('[data-testid="avatar-edit-trigger"]').click()
    cy.get('[data-testid="avatar-file-input"]').selectFile('cypress/fixtures/media/sample-photo.jpg', {
      force: true,
    })

    // ── 3. Se abre el diálogo de recorte con el círculo de vista previa ──────
    cy.get('[data-testid="avatar-crop-dialog"]', { timeout: 10_000 }).should('be.visible')

    // ── 4. Guardar sube el recorte y adjunta el nuevo avatar ─────────────────
    cy.get('[data-testid="avatar-crop-save"]').click()
    cy.get('[data-testid="avatar-crop-dialog"]', { timeout: 10_000 }).should('not.exist')

    // ── 5. El header refleja la nueva foto de inmediato, sin recargar ────────
    // Same accessible-avatar assertion pattern as employee-avatar-upload.cy.ts:
    // an <img> inside the role="img" wrapper means the uploaded photo rendered,
    // not the initials fallback (a <span> instead) — proving the self-service
    // upload+attach succeeded AND the auth store's refreshUser() updated the
    // header without a page reload or a new login.
    headerAvatarImg({ timeout: 10_000 })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('not.be.empty')

    // ── 6. La foto persiste tras recargar (confirma que quedó adjunta) ───────
    cy.reload()
    headerAvatarImg({ timeout: 10_000 })
      .should('have.attr', 'src')
      .and('not.be.empty')

    // ── 7. Reemplazar la foto ya existente también actualiza el header ───────
    // Regression coverage: a returning user's replacement upload must become the
    // shown avatar immediately (UploadMediaService demotes the previous primary
    // for an avatar-context gallery), not leave the old photo showing.
    headerAvatarImg({ timeout: 10_000 })
      .invoke('attr', 'src')
      .then((firstSrc) => {
        cy.get('[data-testid="avatar-edit-trigger"]').click()
        cy.get('[data-testid="avatar-file-input"]').selectFile('cypress/fixtures/media/sample-photo.jpg', {
          force: true,
        })
        cy.get('[data-testid="avatar-crop-dialog"]', { timeout: 10_000 }).should('be.visible')
        cy.get('[data-testid="avatar-crop-save"]').click()
        cy.get('[data-testid="avatar-crop-dialog"]', { timeout: 10_000 }).should('not.exist')

        headerAvatarImg({ timeout: 10_000 })
          .should('have.attr', 'src')
          .and('not.be.empty')
          .and('not.eq', firstSrc)
      })
  })
})
