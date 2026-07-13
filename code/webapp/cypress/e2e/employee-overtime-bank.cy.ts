/**
 * Overtime Bank — E2E happy path (Task #070)
 *
 * Verifies that an employee's overtime bank balance and movement history render
 * in the Employee Detail panel after a checkout (EARNED) + payroll close (PAID)
 * cycle — seeded deterministically by OvertimeBankTestSeeder so the spec doesn't
 * depend on driving the full checkout/authorization/payroll-close flow through
 * the UI.
 *
 * All assertions are scoped inside [data-testid="overtime-bank-section"] —
 * unscoped cy.contains() text matching (e.g. "0:00") can accidentally match
 * unrelated content elsewhere in the panel (e.g. "10:00" in the Schedule
 * section above), so every check below is confined to this section only.
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'overtime-bank') ONCE per file.
 *   Gives EMP-001 one attendance with 90 min of authorized overtime, an EARNED
 *   movement (from checkout) and a PAID movement (from payroll close) — balance
 *   nets to 0 min, which is the correct, expected state once overtime has been
 *   both earned and paid out.
 *
 * To run only this file:
 *   make cypress-spec SPEC=employee-overtime-bank
 */

import users from '../fixtures/users.json'

const { email, password } = users.admin

// ── Helpers ───────────────────────────────────────────────────────────────────

function openEmp001Detail() {
  cy.contains('tr', 'EMP-001', { timeout: 10_000 })
    .find('button[title="Ver detalle"]')
    .click()
  cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')
}

function scrollToOvertimeBank() {
  cy.get('[data-testid="overtime-bank-section"]', { timeout: 10_000 })
    .scrollIntoView()
    .should('be.visible')
}

// ── Suite setup ───────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'overtime-bank', { timeout: 60_000 })
})

beforeEach(() => {
  cy.loginByApi(email, password)
  cy.visitWithAuth('/employees')
  // Wait for the employee table (meaningful page content) before closing the debugger —
  // closeDevDebugger() takes a synchronous DOM snapshot and can no-op if it runs before
  // the DevDebugger has mounted.
  cy.contains('tr', 'EMP-001', { timeout: 10_000 })
  cy.closeDevDebugger()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

it('shows the overtime bank balance and both EARNED/PAID movements', () => {
  openEmp001Detail()
  cy.closeDevDebugger()
  scrollToOvertimeBank()

  cy.get('[data-testid="overtime-bank-section"]').within(() => {
    // Balance card — EARNED (+90) then PAID (-90) nets to 0:00
    cy.contains('Saldo actual (0 min)').should('be.visible')

    // Movement history — both the checkout-generated EARNED and the payroll-close PAID movement
    cy.contains('tr', 'Ganado').should('be.visible').and('contain.text', '90 min')
    cy.contains('tr', 'Pagado').should('be.visible').and('contain.text', 'Admin User')
  })
})
