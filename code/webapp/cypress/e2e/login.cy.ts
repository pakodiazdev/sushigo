describe('Login Flow', () => {
    // Cargar fixtures
    let users: any;

    before(() => {
        // Arrange: Preparar el entorno una sola vez antes de todos los tests
        cy.fixture('users').then((data) => {
            users = data;
        });
    });

    beforeEach(() => {
        // Arrange: Resetear la base de datos antes de cada test
        cy.resetDatabase();
    });

    describe('Login exitoso', () => {
        it('debe permitir el login con credenciales válidas de admin', () => {
            // Arrange: Preparar datos del usuario
            const { email, password, expectedName } = users.admin;

            // Act: Ejecutar el login
            cy.login(email, password);

            // Assert: Verificar que se redirige al dashboard
            cy.url().should('not.include', '/login');
            cy.url().should('include', '/');

            // Assert: Verificar que el usuario está autenticado
            cy.window().then((win) => {
                const authStorage = win.localStorage.getItem('auth-storage');
                expect(authStorage).to.exist;
                const { state } = JSON.parse(authStorage);
                expect(state.token).to.exist;
                expect(state.isAuthenticated).to.be.true;
            });

            // Assert: Verificar que se muestra el contenido del dashboard
            cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
        });

        it('debe mantener la sesión después de recargar la página', () => {
            // Arrange: Hacer login primero
            const { email, password } = users.admin;
            cy.login(email, password);
            cy.url().should('not.include', '/login');

            // Act: Recargar la página
            cy.reload();

            // Assert: Verificar que sigue autenticado
            cy.url().should('not.include', '/login');
            cy.window().then((win) => {
                const authStorage = win.localStorage.getItem('auth-storage');
                expect(authStorage).to.exist;
                const { state } = JSON.parse(authStorage);
                expect(state.token).to.exist;
            });
        });
    });

    describe('Login fallido', () => {
        it('debe mostrar error con credenciales inválidas', () => {
            // Arrange: Preparar credenciales inválidas
            const { email, password } = users.invalidUser;

            // Act: Intentar login con credenciales incorrectas
            cy.visit('/login');
            cy.get('input#email').type(email);
            cy.get('input#password').type(password);
            cy.get('button[type="submit"]').click();

            // Assert: Verificar que se muestra mensaje de error
            cy.contains('credenciales', { matchCase: false }).should('be.visible');

            // Assert: Verificar que permanece en la página de login
            cy.url().should('include', '/login');

            // Assert: Verificar que no hay token en localStorage
            cy.window().then((win) => {
                const authStorage = win.localStorage.getItem('auth-storage');
                if (authStorage) {
                    const { state } = JSON.parse(authStorage);
                    expect(state.isAuthenticated).to.be.false;
                }
            });
        });

        it('debe mantener los datos del formulario después de un error de login', () => {
            // Arrange: Preparar credenciales inválidas
            const { email, password } = users.invalidUser;

            // Act: Intentar login con credenciales incorrectas
            cy.visit('/login');
            cy.get('input#email').type(email);
            cy.get('input#password').type(password);
            cy.get('button[type="submit"]').click();

            // Assert: Esperar que el error sea visible
            cy.contains('credenciales', { matchCase: false }).should('be.visible');

            // Assert: Verificar que los campos mantienen los valores ingresados
            cy.get('input#email').should('have.value', email);
            cy.get('input#password').should('have.value', password);

            // Assert: Verificar que los campos están habilitados para corrección
            cy.get('input#email').should('not.be.disabled');
            cy.get('input#password').should('not.be.disabled');
            cy.get('button[type="submit"]').should('not.be.disabled');
        });

        it('debe mostrar error cuando falta el email', () => {
            // Arrange: Visitar página de login
            cy.visit('/login');

            // Act: Intentar enviar el formulario solo con password
            cy.get('input#password').type('somepassword');
            cy.get('button[type="submit"]').click();

            // Assert: El navegador debe validar que email es requerido
            cy.get('input#email:invalid').should('exist');
        });

        it('debe mostrar error cuando falta la contraseña', () => {
            // Arrange: Visitar página de login
            cy.visit('/login');

            // Act: Intentar enviar el formulario solo con email
            cy.get('input#email').type('test@test.com');
            cy.get('button[type="submit"]').click();

            // Assert: El navegador debe validar que password es requerido
            cy.get('input#password:invalid').should('exist');
        });
    });

    describe('UI y experiencia de usuario', () => {
        it('debe deshabilitar el formulario mientras se procesa el login', () => {
            // Arrange: Visitar página de login
            cy.visit('/login');

            // Act: Llenar formulario y enviar
            cy.get('input#email').type(users.admin.email);
            cy.get('input#password').type(users.admin.password);
            cy.get('button[type="submit"]').click();

            // Assert: Los campos deben estar deshabilitados durante el proceso
            cy.get('input#email').should('be.disabled');
            cy.get('input#password').should('be.disabled');
            cy.get('button[type="submit"]').should('be.disabled');
        });

        it('debe mostrar la información de demo en la página de login', () => {
            // Arrange & Act: Visitar página de login
            cy.visit('/login');

            // Assert: Verificar que se muestra la información de demo
            cy.contains('Demo').should('be.visible');
            cy.contains('admin@sushigo.com').should('be.visible');
        });

        it('debe mostrar el logo de Sushigo', () => {
            // Arrange & Act: Visitar página de login
            cy.visit('/login');

            // Assert: Verificar que el logo está visible
            cy.contains('Sushigo').should('be.visible');
        });
    });

    describe('Navegación', () => {
        it('debe redirigir a login si se intenta acceder a rutas protegidas sin autenticación', () => {
            // Arrange: Asegurar que no hay sesión
            cy.clearLocalStorage();

            // Act: Intentar acceder a una ruta protegida
            cy.visit('/dashboard', { failOnStatusCode: false });

            // Assert: Debe redirigir a login
            cy.url().should('include', '/login');
        });

        it('debe redirigir al dashboard si el usuario ya está autenticado', () => {
            // Arrange: Hacer login primero
            const { email, password } = users.admin;
            cy.login(email, password);
            cy.url().should('not.include', '/login');

            // Act: Intentar volver a la página de login
            cy.visit('/login');

            // Assert: Debe redirigir al dashboard
            cy.url().should('not.include', '/login');
            cy.url().should('eq', Cypress.config().baseUrl + '/');
        });
    });
});
