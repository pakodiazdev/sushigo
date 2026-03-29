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
  cy.get('input#identifier').clear().type(email);
  cy.get('input#password').clear().type(password);
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

/**
 * Minimiza el Dev Debugger flotante si está visible.
 * Solo aparece en entorno devtest — no hace nada en producción.
 */
Cypress.Commands.add('closeDevDebugger', () => {
  cy.get('body').then(($body) => {
    if ($body.find('span:contains("Dev Debugger")').length > 0) {
      cy.log('🔧 Minimizando Dev Debugger...');
      // span → div.flex → div.bg-blue-600 (header) → último button = MinusCircle
      cy.contains('span', 'Dev Debugger')
        .parent()
        .parent()
        .find('button')
        .last()
        .click({ force: true });
    }
  });
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

      /**
       * Minimiza el Dev Debugger flotante si está visible (entorno devtest).
       * @example cy.closeDevDebugger()
       */
      closeDevDebugger(): Chainable<void>;

      /**
       * Cypress task to get password reset link from Mailhog
       * @example cy.task<string | null>('mailhog:getResetLink', 'user@email.com')
       */
      task(event: 'mailhog:getResetLink', email: string, options?: Partial<Loggable & Timeoutable>): Chainable<string | null>;

      /**
       * Cypress task to clear all emails from Mailhog
       * @example cy.task('mailhog:clear')
       */
      task(event: 'mailhog:clear', arg?: null, options?: Partial<Loggable & Timeoutable>): Chainable<null>;
    }
  }
}

export { }
