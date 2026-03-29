/// <reference types="cypress" />

// ***********************************************
// Custom commands for Sushigo E2E tests
// ***********************************************

/**
 * Full database reset: migrate:fresh + seed.
 * SLOW — call only in before() (once per spec file), never in beforeEach().
 * Internally delegates to cy.task('db:reset') which runs in Node.js context.
 */
Cypress.Commands.add('resetDatabase', () => {
  cy.log('🗄️ Resetting database (migrate:fresh + seed)...');
  cy.task('db:reset', null, { timeout: 90_000 }).then(() => {
    cy.log('✅ Database reset complete');
  });
});

/**
 * Login using UI form
 */
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.log(`🔐 Logging in as ${email}`);
  cy.visit('/login');
  cy.get('input#email').type(email);
  cy.get('input#password').type(password);
  cy.get('button[type="submit"]').click();
});

/**
 * Login via API and set token in localStorage
 */
Cypress.Commands.add('loginByApi', (email: string, password: string) => {
  cy.log(`🔐 API Login as ${email}`);
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl') || 'https://sushigo.local/api'}/auth/login`,
    body: { email, password },
    failOnStatusCode: false,
  }).then((response) => {
    expect(response.status).to.eq(200);
    const { token, user } = response.body.data;

    // Store in the same format as zustand persist middleware
    const authStorage = {
      state: {
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        _hasInitialized: true,
      },
      version: 0,
    };

    window.localStorage.setItem('auth-storage', JSON.stringify(authStorage));

    cy.log('✅ Logged in successfully');
  });
});

/**
 * Logout - clear localStorage
 */
Cypress.Commands.add('logout', () => {
  cy.log('🚪 Logging out');
  cy.clearLocalStorage();
});

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Reset database and seed with fresh data
       * @example cy.resetDatabase()
       */
      resetDatabase(): Chainable<void>;

      /**
       * Login using UI form
       * @param email - User email
       * @param password - User password
       * @example cy.login('admin@sushigo.com', 'admin123456')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Login via API and set token in localStorage
       * @param email - User email
       * @param password - User password
       * @example cy.loginByApi('admin@sushigo.com', 'admin123456')
       */
      loginByApi(email: string, password: string): Chainable<void>;

      /**
       * Logout - clear localStorage
       * @example cy.logout()
       */
      logout(): Chainable<void>;
    }
  }
}

export { }
