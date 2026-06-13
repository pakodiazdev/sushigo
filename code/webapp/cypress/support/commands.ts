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
 * Login via API and save auth data as Cypress alias for use with visitWithAuth
 */
Cypress.Commands.add('loginByApi', (email: string, password: string) => {
  cy.log(`🔐 API Login as ${email}`);
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl') || 'https://devtest.api.sushigo.local/api/v1'}/auth/login`,
    body: { email, password },
    failOnStatusCode: false,
  }).then((response) => {
    expect(response.status).to.eq(200);
    const { token, user } = response.body.data;

    // Store only the keys that zustand persist partializes (auth.store.ts):
    //   token, user, isAuthenticated, currentBranch
    // Branches are resolved by initializeAuth() after hydration via
    // extractBranchesFromUser() or fetchBranchesFromApi() for admins.
    // CRITICAL: version must match auth.store.ts (currently 2)
    const authStorage = {
      state: {
        user,
        token,
        isAuthenticated: true,
        currentBranch: null,
      },
      version: 2,
    };

    // Save as alias for the test to use
    cy.wrap(authStorage).as('authStorage');
    cy.log('✅ Login API successful, use cy.visitWithAuth() to load page');
  });
});

/**
 * Visit a page with auth from the loginByApi alias
 */
Cypress.Commands.add('visitWithAuth', (path: string) => {
  cy.get('@authStorage').then((authStorage) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('auth-storage', JSON.stringify(authStorage));
      },
    });
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
 * Oculta completamente el Dev Debugger (sets isHidden=true → component returns null).
 * Uses Ctrl+Shift+D — the same shortcut the component listens to — so the element
 * is removed from the DOM entirely, not just minimized.
 *
 * A minimized DevDebugger keeps a fixed-position badge on screen (z-9999) that
 * can cover panel content in tests. Full hide avoids that.
 *
 * IMPORTANT: call this only after waiting for page content to be rendered
 * (e.g. cy.get('table').should('exist')).  The inner check is a synchronous
 * jQuery snapshot — if React hasn't hydrated yet the DevDebugger won't be in
 * the DOM and the command silently no-ops.
 */
Cypress.Commands.add('closeDevDebugger', () => {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="dev-debugger"]').length > 0) {
      cy.log('🔧 Hiding Dev Debugger (Ctrl+Shift+D)...');
      cy.get('body').type('{ctrl}{shift}d');
      // Verify the element was actually removed from the DOM so tests cannot
      // proceed while the overlay is still covering page content.
      cy.get('[data-testid="dev-debugger"]').should('not.exist');
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
       * Visit a page with auth from loginByApi
       * @param path - The path to visit
       * @example cy.visitWithAuth('/attendance/today')
       */
      visitWithAuth(path: string): Chainable<void>;

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
