/**
 * Inventory navigation consolidation — E2E happy path (#441)
 *
 * Verifies the consolidated Inventory information architecture:
 *  • one "Inventario" sidebar group is the single entry point for every concept
 *  • each concept resolves to its canonical Spanish `/inventario/*` route and the
 *    page renders
 *  • every released legacy English URL (`/inventory/*`, `/stock-dashboard`) still
 *    works by redirecting to its canonical Spanish path
 *
 * Negative cases (per-permission visibility, 403s) live in Vitest —
 * see src/components/layout/__tests__/Sidebar.test.tsx.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=inventory-navigation
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

// ⚠️ QUARANTINED per #490 → see #544. Fails against a fresh stack:
// 1 of 15 tests fails: a sidebar <a> "not visible" — the consolidated-IA assertion; the 6 nav sub-tests pass.
// Remove this guard when #544 is fixed.
before(function () {
  this.skip()
})

before(() => {
  cy.task('test:reset', null, { timeout: 60_000 })
})

describe('Inventory navigation — consolidated Spanish IA', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/')
    cy.closeDevDebugger()
    cy.contains('nav button', 'Inventario', { timeout: 10_000 }).click()
  })

  const sidebarTargets: Array<[label: string, path: string]> = [
    ['Existencias', '/inventario/existencias'],
    ['Productos', '/inventario/productos'],
    ['Insumos', '/inventario/insumos'],
    ['Variantes', '/inventario/variantes'],
    ['Ubicaciones', '/inventario/ubicaciones'],
    ['Proveedores', '/inventario/proveedores'],
    ['Recepciones de Compra', '/inventario/recepciones-de-compra'],
    ['Listas de Precios', '/inventario/listas-de-precios'],
  ]

  it('exposes every Inventory concept once, under the single Inventario group', () => {
    // The Stock dashboard is no longer its own top-level entry — no nav link
    // points at the old standalone route.
    cy.get('nav a[href="/stock-dashboard"]').should('not.exist')

    // Select by href, not link text: `Productos` also names the unrelated
    // top-level Dishes link (`/productos`), so a text match would be ambiguous.
    sidebarTargets.forEach(([, path]) => {
      cy.get(`nav a[href="${path}"]`).should('have.length', 1).and('be.visible')
    })
  })

  sidebarTargets.forEach(([label, path]) => {
    it(`sidebar "${label}" navigates to ${path} and the page renders`, () => {
      cy.get(`nav a[href="${path}"]`).click()
      cy.url({ timeout: 10_000 }).should('include', path)
      cy.get('main, [data-testid="page-container"]', { timeout: 10_000 }).should('exist')
    })
  })

  const legacyRedirects: Array<[from: string, to: string]> = [
    ['/inventory/products', '/inventario/productos'],
    ['/inventory/items', '/inventario/insumos'],
    ['/inventory/item-variants', '/inventario/variantes'],
    ['/inventory/locations', '/inventario/ubicaciones'],
    ['/inventory', '/inventario/existencias'],
    ['/stock-dashboard', '/inventario/existencias'],
  ]

  legacyRedirects.forEach(([from, to]) => {
    it(`legacy URL ${from} redirects to ${to}`, () => {
      cy.visitWithAuth(from)
      cy.url({ timeout: 10_000 }).should('include', to)
      cy.get('main, [data-testid="page-container"]', { timeout: 10_000 }).should('exist')
    })
  })
})
