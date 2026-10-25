/**
 * Public Demo banner (#635) — E2E happy path only.
 *
 * The banner is driven at runtime by GET /api/v1/app-info (Demo and QA share the
 * same `preview` image, so only the API knows it is the Demo). The E2E stack runs
 * APP_ENV=testing, so the Demo response is stubbed with cy.intercept; the real
 * endpoint's contract is covered by PHPUnit (tests/Feature/Demo/AppInfoTest.php)
 * and the rendering branches by Vitest (features/platform/demo-mode).
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const demoAppInfo = {
  status: 200,
  meta: null,
  data: {
    environment: 'demo',
    is_demo: true,
    data_resets: true,
    demo_account: { email: 'demo@sushigo.com' },
  },
}

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

beforeEach(() => {
  cy.clearLocalStorage()
  cy.intercept('GET', '**/api/v1/app-info', { statusCode: 200, body: demoAppInfo }).as('appInfo')
})

describe('Demo banner — Happy Path', () => {
  it('muestra el aviso de demostración en el login y dentro de la aplicación', () => {
    cy.visit('/login')
    cy.wait('@appInfo')

    cy.get('[data-testid="demo-banner"]')
      .should('be.visible')
      .and('contain', 'Entorno de demostración')
      .and('contain', 'demo@sushigo.com')

    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login')

    cy.get('[data-testid="demo-banner"]').should('be.visible')
  })
})
