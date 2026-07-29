/**
 * Dev-Only Components Catalog Page — E2E happy path
 *
 * Verifica que la página /dev/components (issue #324) es alcanzable en
 * desarrollo, aparece en el sidebar como "Componentes" y muestra el catálogo
 * con ejemplos en vivo.
 *
 * Los casos negativos (redirect fuera de dev) se cubren en Vitest, ya que
 * requieren simular `import.meta.env.DEV = false` — algo que no aplica a una
 * corrida real de Cypress contra el servidor de desarrollo.
 * Ver: src/lib/__tests__/route-guards.test.ts, src/components/layout/__tests__/Sidebar.test.tsx
 *
 * Nota: los asserts sobre entradas del catálogo usan `.scrollIntoView()` antes
 * de `.should('be.visible')` porque la página es larga (~27 entradas) y el
 * ítem "Componentes" está al final de un sidebar con scroll propio —
 * `.should()` no hace auto-scroll como sí lo hacen los comandos de acción.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'attendance') — el seeder crea admin@sushigo.com.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=dev-components-catalog
 */

const ADMIN_EMAIL = 'admin@sushigo.com'
const ADMIN_PASSWORD = 'admin123456'

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 120_000 })
})

describe('Dev Components Catalog — happy path', () => {
  beforeEach(() => {
    cy.loginByApi(ADMIN_EMAIL, ADMIN_PASSWORD)
    cy.visitWithAuth('/')
    cy.closeDevDebugger()
  })

  it('el sidebar muestra "Componentes" en desarrollo', () => {
    cy.contains('nav a, nav button', 'Componentes', { timeout: 10_000 })
      .scrollIntoView()
      .should('be.visible')
  })

  it('navegar a Componentes muestra el catálogo con ejemplos en vivo', () => {
    cy.contains('nav a', 'Componentes', { timeout: 10_000 }).click()
    cy.url({ timeout: 10_000 }).should('include', '/dev/components')

    cy.contains('h1, h2, h3', 'Componentes', { timeout: 10_000 }).should('be.visible')

    // Spot-check entries from a few different sections render with their code snippet.
    cy.contains('Button').scrollIntoView().should('be.visible')
    cy.contains('@/components/ui/button').scrollIntoView().should('be.visible')
    cy.contains('DataGrid').scrollIntoView().should('be.visible')
    cy.contains('@/components/ui/data-grid').scrollIntoView().should('be.visible')
  })

  it('un ejemplo interactivo del catálogo (ToggleSwitch) responde a un click', () => {
    cy.visitWithAuth('/dev/components')
    cy.contains('span', 'Notificaciones activas', { timeout: 10_000 })
      .parent()
      .find('[role="switch"]')
      .as('toggle')

    cy.get('@toggle').should('have.attr', 'aria-checked', 'false')
    cy.get('@toggle').scrollIntoView().click()
    cy.get('@toggle').should('have.attr', 'aria-checked', 'true')
  })
})
