/**
 * Self-Service Avatar — E2E happy path (#420)
 *
 * A non-admin user (no users.update) replaces their own avatar from the
 * /perfil page, and immediately sees the uploaded photo (not the initials
 * fallback) in the application header — without signing out and back in.
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

  it('a non-admin user replaces their own avatar and sees it in the header without re-login', () => {
    // Header.tsx renders two Avatar instances for the same user (mobile + desktop
    // menus, toggled by CSS media query, not conditional rendering) — at the
    // 1280px default Cypress viewport only the desktop one (`.lg:flex`) is
    // actually visible, so every assertion below is scoped to it specifically
    // rather than picking whichever the mobile-first DOM order happens to match.
    const headerAvatarSelector = '.lg\\:flex [role="img"][aria-label="' + expectedName + '"] img'
    const headerAvatarImg = (options?: Partial<Cypress.Timeoutable>) => cy.get(headerAvatarSelector, options)

    // ── 1. Only the initials fallback renders before any avatar is attached ──
    headerAvatarImg().should('not.exist')

    // ── 2. Ir a Mi perfil y subir foto ────────────────────────────────────────
    cy.visit('/perfil')
    cy.url().should('include', '/perfil', { timeout: 10_000 })

    cy.get('[data-testid="media-uploader-input"]').selectFile('cypress/fixtures/media/sample-photo.jpg', {
      force: true,
    })
    cy.get('[data-testid="media-uploader-asset"]', { timeout: 15_000 }).should('have.length', 1)

    // ── 3. El header refleja la nueva foto de inmediato, sin recargar ────────
    // Same accessible-avatar assertion pattern as employee-avatar-upload.cy.ts:
    // an <img> inside the role="img" wrapper means the uploaded photo rendered,
    // not the initials fallback (a <span> instead) — proving the self-service
    // PATCH succeeded AND the auth store's refreshUser() updated the header
    // without a page reload or a new login.
    headerAvatarImg({ timeout: 10_000 })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('not.be.empty')

    // ── 4. La foto persiste tras recargar (confirma que quedó adjunta) ───────
    cy.reload()
    headerAvatarImg({ timeout: 10_000 })
      .should('have.attr', 'src')
      .and('not.be.empty')

    // ── 5. Reemplazar la foto ya existente también actualiza el header ───────
    // Regression coverage: a returning user's replacement upload must become the
    // shown avatar immediately (UploadMediaService demotes the previous primary for
    // an avatar-context gallery), not just add a second, non-primary photo that
    // never surfaces anywhere until the star control is clicked by hand — the gap
    // this spec's original first-time-upload-only flow didn't catch.
    headerAvatarImg({ timeout: 10_000 })
      .invoke('attr', 'src')
      .then((firstSrc) => {
        cy.get('[data-testid="media-uploader-input"]').selectFile('cypress/fixtures/media/sample-photo.jpg', {
          force: true,
        })
        cy.get('[data-testid="media-uploader-asset"]', { timeout: 15_000 }).should('have.length', 2)

        headerAvatarImg({ timeout: 10_000 })
          .should('have.attr', 'src')
          .and('not.be.empty')
          .and('not.eq', firstSrc)
      })
  })
})
