/**
 * Platillos (dishes) catalog — E2E happy path (#380)
 *
 * Exercises the real /productos page built on top of the dishes backend
 * domain (#379): the seeded catalog renders grouped by category, and a new
 * dish can be created end-to-end through the SlidePanel form.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=dishes-catalog
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

before(() => {
  cy.task('test:reset', 'dishes', { timeout: 60_000 })
})

describe('Platillos — Catalog', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/productos')
    cy.url().should('include', '/productos', { timeout: 10_000 })
    // Wait for real content before closing the debugger — closing it too early (before it has
    // even mounted) is a no-op, and it then appears mid-test covering the header's buttons.
    cy.contains('button', 'Nuevo Platillo', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
  })

  it('lists the seeded dishes grouped by category', () => {
    // DishesTestSeeder seeds Rollos (California Roll, Spicy Tuna Roll) and
    // Ramen (Tonkotsu Ramen) — see code/api/database/seeders/Testing/DishesTestSeeder.php
    cy.contains('h2', 'Rollos', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Ramen').should('be.visible')
    cy.contains('California Roll').should('be.visible')
    cy.contains('Tonkotsu Ramen').should('be.visible')
  })

  it('creates a new dish and sees it appear in its category group', () => {
    cy.contains('button', 'Nuevo Platillo').click()

    // Scoped to the form — the page behind the SlidePanel also has a "Categoría" <select>
    // (the list filter), so an unscoped cy.get('select') would hit the wrong one.
    cy.get('form').within(() => {
      cy.get('select').select('Rollos')
      cy.get('input[placeholder="e.g., California Roll"]').type('Cypress Dragon Roll', { force: true })
      cy.get('input[type="number"]').first().type('99.50', { force: true })
      cy.contains('button', 'Create Dish').scrollIntoView().click({ force: true })
    })

    cy.contains('Dish created successfully', { timeout: 10_000 }).should('be.visible')
    cy.contains('h2', 'Rollos', { timeout: 10_000 }).should('be.visible')
    cy.contains('Cypress Dragon Roll').should('be.visible')
  })
})
