/**
 * Login Flow — E2E tests (Happy Path Only)
 *
 * Per testing strategy (doc/conventions/testing/testing-strategy.md):
 * - Cypress tests ONLY the critical happy path
 * - UI validation, error cases → Vitest (src/pages/__tests__/login.test.tsx)
 * - Auth guards, redirects → Vitest (src/components/layout/__tests__/Layout.test.tsx)
 * - API auth/security → PHPUnit Feature tests
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset') ONCE per file (~3-5s).
 * • beforeEach() → cy.clearLocalStorage() only (milliseconds).
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

// ── Suite setup ────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

beforeEach(() => {
  cy.clearLocalStorage()
})

// ══════════════════════════════════════════════════════════════════════════════
// Happy Path — Login, session persistence, logout, re-login
// ══════════════════════════════════════════════════════════════════════════════

describe('Login — Happy Path', () => {
  it('inicia sesión y muestra el dashboard', () => {
    cy.login(adminEmail, adminPassword)

    cy.url().should('not.include', '/login')
    cy.contains('Dashboard', { timeout: 10_000 }).should('be.visible')

    // Verify auth state persisted in localStorage
    cy.window().then((win) => {
      const raw = win.localStorage.getItem('auth-storage')
      expect(raw).to.exist
      const { state } = JSON.parse(raw!)
      expect(state.token).to.exist
      expect(state.isAuthenticated).to.be.true
    })
  })

  it('mantiene la sesión después de recargar la página', () => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login')

    cy.reload()

    cy.url().should('not.include', '/login')
    cy.contains('Dashboard', { timeout: 10_000 }).should('be.visible')
  })
})

describe('Logout — Happy Path', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
  })

  it('cierra sesión y redirige a /login', () => {
    cy.get('button[title="Cerrar sesión"]').click()

    cy.url().should('include', '/login', { timeout: 10_000 })

    // Verify auth state cleared
    cy.window().then((win) => {
      const raw = win.localStorage.getItem('auth-storage')
      if (raw) {
        const { state } = JSON.parse(raw)
        expect(state.isAuthenticated).to.be.false
        expect(state.token).to.be.null
      }
    })
  })

  it('puede volver a iniciar sesión después del logout', () => {
    cy.get('button[title="Cerrar sesión"]').click()
    cy.url().should('include', '/login', { timeout: 10_000 })

    // Wait for DOM to stabilize after logout → / → /login redirect chain
    cy.get('input#identifier', { timeout: 10_000 }).should('be.visible')
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500)
    cy.get('input#identifier').clear().type(adminEmail)
    cy.get('input#password').clear().type(adminPassword)
    cy.get('button[type="submit"]').click()

    cy.url().should('not.include', '/login')
  })
})
