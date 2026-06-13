/**
 * Schedule Indefinite Override Summary — E2E tests
 *
 * Verifies that indefinite exceptions (effective_to = null) are absorbed into
 * the schedule summary line instead of being ignored, while temporary overrides
 * are still counted in the ⚡ badge.
 *
 * Seeder: 'schedule-summary'
 *   AttendanceTestSeeder  → EMP-001..EMP-008 (Mon-Sat 1:00 PM – 10:00 PM, Sun off)
 *   ScheduleSummaryOverrideSeeder → EMP-001 gets:
 *     • Indefinite override: Wednesday (X) 2:00 PM – 11:00 PM  (effective_to null)
 *     • Temporary override: Saturday (S)  10:00 AM – 4:00 PM   (expires next month)
 *
 * Expected summary for EMP-001:
 *   Card:   🕐 L, M, J, V, S · 1:00 PM – 10:00 PM · X · 2:00 PM – 11:00 PM
 *   Dialog: same compact line + ⚡ +1 badge (only the temporary Saturday counts)
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'schedule-summary') ONCE per file (~4-6s)
 * • beforeEach() → login + navigate to /employees
 *
 * For running only this file:
 *   make cypress-spec SPEC=schedule-indefinite-summary
 *   make cypress-debug SPEC=schedule-indefinite-summary
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'schedule-summary', { timeout: 60_000 })
})

// ══════════════════════════════════════════════════════════════════════════════
// 1. Employee card — schedule summary section
// ══════════════════════════════════════════════════════════════════════════════

describe('Indefinite override — employee card summary', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    // Wait for the employee table to render before closing the DevDebugger.
    // cy.closeDevDebugger uses a synchronous DOM check — React must be
    // hydrated first or the DevDebugger won't be found and stays open.
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('shows comma-separated day groups instead of a plain range when an indefinite override exists', () => {
    cy.contains('tr', 'EMP-001', { timeout: 10_000 }).find('button[title="Ver detalle"]').click()
    cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')

    cy.contains('Horario activo', { timeout: 10_000 }).scrollIntoView().should('be.visible')

    // The work line should use comma-separated groups, NOT the compact "L-S" range
    cy.contains(/L, M, J, V, S/, { timeout: 10_000 }).should('be.visible')

    // Wednesday's overridden times must appear
    cy.contains(/2:00 PM/).should('be.visible')
    cy.contains(/11:00 PM/).should('be.visible')

    // The original range label "L-S" must NOT appear in the summary
    cy.contains(/🕐 L-S/).should('not.exist')
  })

  it('shows the original range format for an employee without indefinite overrides', () => {
    // EMP-002 has no overrides — should still show the compact "L-S" format
    cy.contains('tr', 'EMP-002', { timeout: 10_000 }).find('button[title="Ver detalle"]').click()
    cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')

    cy.contains('Horario activo', { timeout: 10_000 }).scrollIntoView().should('be.visible')
    cy.contains(/🕐 L-S/, { timeout: 10_000 }).should('be.visible')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. Schedule dialog — compact summary header + badge
// ══════════════════════════════════════════════════════════════════════════════

describe('Indefinite override — schedule dialog compact summary', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('shows grouped day summary and ⚡ +1 badge (only the temporary override counts)', () => {
    cy.contains('tr', 'EMP-001', { timeout: 10_000 }).find('button[title="Ver detalle"]').click()
    cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')

    cy.contains('button', 'Ver horario', { timeout: 10_000 }).scrollIntoView().click()
    cy.contains('dialog', 'Horarios', { timeout: 5_000 }).should('be.visible')

    cy.get('dialog').within(() => {
      // Compact summary shows comma-separated groups
      cy.contains(/L, M, J, V, S/, { timeout: 10_000 }).should('be.visible')
      cy.contains(/2:00 PM/).should('be.visible')
      cy.contains(/11:00 PM/).should('be.visible')

      // ⚡ badge counts ONLY the temporary Saturday override (= 1)
      // The indefinite Wednesday override is absorbed into the summary line
      cy.contains('+1').should('be.visible')
    })

    cy.contains('button', 'Cerrar').click()
    cy.contains('dialog', 'Horarios').should('not.exist')
  })
})
