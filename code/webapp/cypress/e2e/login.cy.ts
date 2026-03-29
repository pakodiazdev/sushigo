/**
 * Login Flow — E2E tests
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('db:reset') ONCE per file (~30s). All tests share this state.
 * • beforeEach() → cy.clearLocalStorage() only (milliseconds). Ensures each test
 *                  starts with a clean session without hitting the database.
 *
 * Tests that only interact with the UI (validation, layout) are grouped
 * separately and don't need login or DB data — they run extra fast.
 */

import users from '../fixtures/users.json'

// ── Shared helpers ─────────────────────────────────────────────────────────────

const { email: adminEmail, password: adminPassword } = users.admin
const { email: invalidEmail, password: invalidPassword } = users.invalidUser

// ── Suite setup ────────────────────────────────────────────────────────────────

before(() => {
  // Reset DB once for the entire file — not per test.
  cy.task('db:reset', null, { timeout: 90_000 })
})

beforeEach(() => {
  // Clear session state between tests (fast — no DB touch).
  cy.clearLocalStorage()
})

// ══════════════════════════════════════════════════════════════════════════════
// 1. UI — layout and static content (no auth needed)
// ══════════════════════════════════════════════════════════════════════════════

describe('Login page — UI', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('muestra el logo de Sushigo', () => {
    cy.contains('Sushigo').should('be.visible')
  })

  it('muestra credenciales de demo', () => {
    cy.contains('Demo').should('be.visible')
    cy.contains('admin@sushigo.com').should('be.visible')
  })

  it('requiere email — validación nativa del navegador', () => {
    cy.get('input#password').type('somepassword')
    cy.get('button[type="submit"]').click()
    cy.get('input#email:invalid').should('exist')
  })

  it('requiere contraseña — validación nativa del navegador', () => {
    cy.get('input#email').type('test@test.com')
    cy.get('button[type="submit"]').click()
    cy.get('input#password:invalid').should('exist')
  })

  it('deshabilita el formulario mientras procesa el login', () => {
    cy.get('input#email').type(adminEmail)
    cy.get('input#password').type(adminPassword)
    cy.get('button[type="submit"]').click()

    // Los campos se deshabilitan durante el submit
    cy.get('input#email').should('be.disabled')
    cy.get('input#password').should('be.disabled')
    cy.get('button[type="submit"]').should('be.disabled')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. Login exitoso
// ══════════════════════════════════════════════════════════════════════════════

describe('Login exitoso', () => {
  it('redirige fuera de /login con credenciales válidas de admin', () => {
    cy.login(adminEmail, adminPassword)

    cy.url().should('not.include', '/login')
    cy.url().should('include', '/')
  })

  it('almacena token y estado de autenticación en localStorage', () => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login')

    cy.window().then((win) => {
      const raw = win.localStorage.getItem('auth-storage')
      expect(raw).to.exist
      const { state } = JSON.parse(raw!)
      expect(state.token).to.exist
      expect(state.isAuthenticated).to.be.true
    })
  })

  it('muestra contenido del dashboard tras el login', () => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login')
    cy.contains('Dashboard', { timeout: 10_000 }).should('be.visible')
  })

  it('mantiene la sesión después de recargar la página', () => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login')

    cy.reload()

    cy.url().should('not.include', '/login')
    cy.window().then((win) => {
      const raw = win.localStorage.getItem('auth-storage')
      expect(raw).to.exist
      const { state } = JSON.parse(raw!)
      expect(state.token).to.exist
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 3. Login fallido
// ══════════════════════════════════════════════════════════════════════════════

describe('Login fallido', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('muestra error con credenciales inválidas', () => {
    cy.get('input#email').type(invalidEmail)
    cy.get('input#password').type(invalidPassword)
    cy.get('button[type="submit"]').click()

    cy.contains('credenciales', { matchCase: false, timeout: 8_000 }).should('be.visible')
    cy.url().should('include', '/login')
  })

  it('no guarda token tras credenciales inválidas', () => {
    cy.get('input#email').type(invalidEmail)
    cy.get('input#password').type(invalidPassword)
    cy.get('button[type="submit"]').click()

    cy.contains('credenciales', { matchCase: false, timeout: 8_000 }).should('be.visible')

    cy.window().then((win) => {
      const raw = win.localStorage.getItem('auth-storage')
      if (raw) {
        const { state } = JSON.parse(raw)
        expect(state.isAuthenticated).to.be.false
      }
    })
  })

  it('mantiene los valores del formulario tras un error', () => {
    cy.get('input#email').type(invalidEmail)
    cy.get('input#password').type(invalidPassword)
    cy.get('button[type="submit"]').click()

    cy.contains('credenciales', { matchCase: false, timeout: 8_000 }).should('be.visible')

    cy.get('input#email').should('have.value', invalidEmail)
    cy.get('input#password').should('have.value', invalidPassword)
    cy.get('input#email').should('not.be.disabled')
    cy.get('input#password').should('not.be.disabled')
    cy.get('button[type="submit"]').should('not.be.disabled')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 4. Navegación y guards de ruta
// ══════════════════════════════════════════════════════════════════════════════

describe('Navegación y guards', () => {
  it('redirige a /login al acceder a ruta protegida sin sesión', () => {
    cy.clearLocalStorage()
    cy.visit('/dashboard', { failOnStatusCode: false })
    cy.url().should('include', '/login')
  })

  it('redirige al dashboard si el usuario ya está autenticado y visita /login', () => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login')

    cy.visit('/login')

    cy.url().should('not.include', '/login')
    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })
})
