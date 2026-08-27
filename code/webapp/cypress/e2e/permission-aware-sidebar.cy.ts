/**
 * Permission-Aware Sidebar — E2E happy path
 *
 * Verifica que el sidebar y las rutas se adaptan al rol del usuario logueado.
 * Happy path: inventory-manager ve solo las secciones de inventario y navega con éxito.
 *
 * Casos negativos (403, ítems ocultos para otros roles) → cubiertos en Vitest.
 * Ver: src/components/layout/__tests__/Sidebar.test.tsx
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'attendance') — el seeder crea inventory@sushigo.com
 *   con rol inventory-manager y todos los permisos de inventario.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=permission-aware-sidebar
 */

const INVENTORY_EMAIL = 'inventory@sushigo.com'
const INVENTORY_PASSWORD = 'inventory123456'

// ── Suite setup ────────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 120_000 })
})

// ══════════════════════════════════════════════════════════════════════════════
// Happy path — inventory-manager ve y navega las secciones de inventario
// ══════════════════════════════════════════════════════════════════════════════

describe('Sidebar permission-aware — inventory-manager', () => {
  beforeEach(() => {
    cy.loginByApi(INVENTORY_EMAIL, INVENTORY_PASSWORD)
    cy.visitWithAuth('/')
    cy.closeDevDebugger()
  })

  it('el sidebar muestra Inventario con Existencias como sub-item para el inventory-manager', () => {
    cy.contains('nav a, nav button', 'Inventario', { timeout: 10_000 }).should('be.visible').click()
    cy.contains('nav a', 'Existencias', { timeout: 5_000 }).should('be.visible')
  })

  it('el sidebar no muestra Empleados ni Configuración al inventory-manager', () => {
    cy.contains('nav', 'Empleados').should('not.exist')
    cy.contains('nav', 'Configuración').should('not.exist')
  })

  it('el inventory-manager puede navegar a /inventario/insumos y la página carga', () => {
    cy.contains('nav button', 'Inventario', { timeout: 10_000 }).click()
    cy.contains('nav a', 'Insumos', { timeout: 5_000 }).click()
    cy.url({ timeout: 10_000 }).should('include', '/inventario/insumos')
    cy.get('main, [data-testid="page-container"]', { timeout: 10_000 }).should('exist')
  })

  it('el inventory-manager puede navegar a /inventario/existencias y la página carga', () => {
    cy.contains('nav button', 'Inventario', { timeout: 10_000 }).click()
    cy.contains('nav a', 'Existencias', { timeout: 10_000 }).click()
    cy.url({ timeout: 10_000 }).should('include', '/inventario/existencias')
    cy.get('main, [data-testid="page-container"]', { timeout: 10_000 }).should('exist')
  })

  it('la URL heredada /stock-dashboard redirige a /inventario/existencias', () => {
    cy.visitWithAuth('/stock-dashboard')
    cy.url({ timeout: 10_000 }).should('include', '/inventario/existencias')
  })

  it('acceso directo a /unauthorized muestra la página 403', () => {
    cy.visitWithAuth('/unauthorized')
    cy.contains('403', { timeout: 10_000 }).should('be.visible')
    cy.contains('Sin acceso').should('be.visible')
  })
})
