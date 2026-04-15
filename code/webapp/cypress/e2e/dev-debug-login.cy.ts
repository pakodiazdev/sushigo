/**
 * Dev Debug Login — E2E tests (Happy Path Only)
 *
 * Per testing strategy (doc/conventions/testing/testing-strategy.md):
 * - Cypress tests ONLY the happy path
 * - Security/env guard cases → PHPUnit (tests/Feature/Dev/DevLoginTest.php)
 * - isDevLoginEnabled() logic → Vitest (dev-login-enabled.test.ts)
 *
 * Requires in the test environment:
 *   VITE_LOGIN_WITH_DEVDEBUG=true
 *   VITE_APP_ENV=local    (or whichever value is in VITE_DEV_LOGIN_ALLOWED_ENVIRONMENTS)
 *   LOGIN_WITH_DEVDEBUG=true  (API side)
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset') ONCE per file (~3-5s).
 * • beforeEach() → cy.clearLocalStorage() only (milliseconds).
 */

before(() => {
    cy.task('test:reset', null, { timeout: 60_000 })
})

beforeEach(() => {
    cy.clearLocalStorage()
})

// ══════════════════════════════════════════════════════════════════════════════
// Happy Path — Dev Login via DevDebugger
// ══════════════════════════════════════════════════════════════════════════════

describe('Dev Debug Login — Happy Path', () => {
    it('muestra la sección Dev Login en el DevDebugger cuando no hay sesión', () => {
        cy.visit('/login')

        // Show DevDebugger (hidden by default in e2e — trigger with Ctrl+Shift+D)
        cy.get('body').type('{ctrl}{shift}d')

        cy.contains('Dev Debugger', { timeout: 5_000 }).should('be.visible')
        cy.contains('Dev Login').should('be.visible')
    })

    it('lista usuarios y permite iniciar sesión sin contraseña', () => {
        cy.visit('/login')

        cy.get('body').type('{ctrl}{shift}d')
        cy.contains('Dev Login', { timeout: 5_000 }).should('be.visible')

        // Users should appear (seeded by test:reset)
        cy.get('[data-testid="dev-login-user"]', { timeout: 10_000 })
            .should('have.length.at.least', 1)
            .first()
            .click()

        // After clicking, should be authenticated and redirected away from login
        cy.url({ timeout: 15_000 }).should('not.include', '/login')

        // Auth state persisted in localStorage
        cy.window().then((win) => {
            const raw = win.localStorage.getItem('auth-storage')
            expect(raw).to.exist
            const { state } = JSON.parse(raw!)
            expect(state.token).to.exist
            expect(state.isAuthenticated).to.be.true
        })
    })

    it('filtra usuarios por nombre con el buscador local', () => {
        cy.visit('/login')

        cy.get('body').type('{ctrl}{shift}d')
        cy.contains('Dev Login', { timeout: 5_000 }).should('be.visible')

        // Wait for list to load
        cy.get('[data-testid="dev-login-user"]', { timeout: 10_000 }).should('exist')

        // Type something that should filter to 0 or fewer results
        cy.get('[placeholder="Buscar usuario..."]').type('zzznoresult')
        cy.contains('Sin resultados').should('be.visible')
        cy.get('[data-testid="dev-login-user"]').should('not.exist')
    })
})
