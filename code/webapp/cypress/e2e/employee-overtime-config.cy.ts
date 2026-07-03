/**
 * Employee Overtime Pay Config — E2E happy path
 *
 * Verifies that an admin can configure how overtime is valued for an
 * employee (agreed hourly rate) and see the current configuration
 * displayed in the employee detail panel.
 *
 * Seeder group: 'attendance' — creates EMP-002 María García (cook).
 *
 * Happy path:
 *   1. Admin navigates to /employees and opens María García's detail panel.
 *   2. "Pago de Horas Extra" section is visible with no config set.
 *   3. Admin clicks "Configurar", selects "Tarifa acordada", sets a rate
 *      and a date, submits.
 *   4. Success toast appears.
 *   5. Current config card shows the method and rate.
 *
 * For running only this file:
 *   make cypress-spec SPEC=employee-overtime-config
 *   make cypress-debug SPEC=employee-overtime-config
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const EMPLOYEE_NAME = 'María García'

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

describe('Employee Overtime Pay Config — admin happy path', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('shows no overtime config initially and allows setting agreed rate', () => {
    cy.contains(EMPLOYEE_NAME).closest('tr').find('button[aria-label="Ver detalle"]').click()
    cy.contains('Pago de Horas Extra').scrollIntoView().should('be.visible')

    // No config set yet
    cy.contains('Sin configuración de horas extra').should('be.visible')

    // Open the config form
    cy.contains('button', 'Configurar').click()

    // Select "Tarifa acordada" (native select + dispatchEvent for React 17+ delegation)
    cy.get('select#valuation_method').should('be.visible').should('not.be.disabled').then(($select) => {
      const select = $select[0] as HTMLSelectElement
      const win = select.ownerDocument.defaultView as Window
      select.value = 'AGREED_RATE'
      select.dispatchEvent(new win.Event('change', { bubbles: true }))
    })

    // Fill hourly rate
    cy.get('input#hourly_rate').should('be.visible').type('95.50')

    // Set effective date
    const today = new Date().toISOString().slice(0, 10)
    cy.get('input#effective_from').type(today)

    // Submit
    cy.contains('button', 'Guardar').click()

    // Toast should appear
    cy.contains('Configuración de horas extra guardada').should('be.visible')

    // The current config card is now shown
    cy.get('[data-testid="current-overtime-config"]').scrollIntoView().should('be.visible')
    cy.get('[data-testid="current-overtime-config"]').contains('Tarifa acordada').should('be.visible')
    cy.get('[data-testid="current-overtime-config"]').contains('Activo').should('be.visible')
    cy.contains('Sin configuración de horas extra').should('not.exist')
  })
})
