/**
 * Schedule History — E2E tests
 *
 * Tests the schedule history tab in the schedule dialog, which shows
 * the full history of schedules with their exceptions.
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 * • beforeEach() → login + navigate to employee detail.
 *
 * For running only this file:
 *   make cypress-spec SPEC=schedule-history
 *   make cypress-debug SPEC=schedule-history
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

// ── Suite setup ─────────────────────────────────────────────────────────────

// ⚠️ QUARANTINED per #490 → see #557 (CI-only failure; passes locally). Fails against a fresh stack:
// CI-only (passes locally on Electron): an <h3.flex.items-center.gap-2.text-sm.font-semibold> section heading is "not visible" after 15s (schedule-history.cy.ts) — same overlay/scroll signature as #553, only reproduces on the fresh CI stack under Chromium.
// Remove this guard when #557 is fixed.
before(function () {
  this.skip()
})

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

// ══════════════════════════════════════════════════════════════════════════════
// 1. View schedule history
// ══════════════════════════════════════════════════════════════════════════════

describe('Schedule History', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    // Wait for the employee table to exist before closing the debugger.
    // closeDevDebugger() uses a synchronous jQuery snapshot — if React hasn't
    // hydrated yet the DevDebugger won't be in the DOM and the command no-ops.
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('shows schedule history with ACTIVO badge and date range', () => {
    // ── 1. Find and click on an employee with schedule ───────────────────────
    // EMP-001 is seeded with an active schedule (Mon-Sat 13:00-22:00)
    cy.contains('tr', 'EMP-001', { timeout: 10_000 }).find('button[title="Ver detalle"]').click()

    // Wait for employee detail panel to open
    cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')

    // ── 2. Open schedule dialog ──────────────────────────────────────────────
    cy.contains('Horario activo', { timeout: 10_000 }).scrollIntoView().should('be.visible')
    cy.contains('button', 'Ver horario').scrollIntoView().click()

    // Dialog should open with tabs
    cy.contains('dialog', 'Horarios', { timeout: 5_000 }).should('be.visible')

    // ── 3. Click on Historial tab ────────────────────────────────────────────
    cy.contains('button', 'Historial').click()

    // ── 4. Verify schedule history is displayed ──────────────────────────────
    // Should show ACTIVO badge for the current schedule
    cy.contains('ACTIVO', { timeout: 5_000 }).should('be.visible')

    // Should show date range with "→ hoy" for active schedule
    cy.contains('→ hoy').should('be.visible')

    // Should show schedule summary line (L-S pattern from seeder)
    cy.get('dialog').within(() => {
      // The schedule summary shows time range
      cy.contains(/1:00\s*PM|13:00/).should('exist')
      cy.contains(/10:00\s*PM|22:00/).should('exist')
    })

    // ── 5. Close dialog ──────────────────────────────────────────────────────
    cy.contains('button', 'Cerrar').click()
    cy.contains('dialog', 'Horarios').should('not.exist')
  })

  it('shows empty state when employee has no schedule history', () => {
    // Create a new employee without schedule to test empty state
    cy.contains('button', 'Nuevo Empleado').click()

    // Fill minimal data
    cy.get('input[name="first_name"]').type('Test', { force: true })
    cy.get('input[name="last_name"]').type('NoSchedule', { force: true })
    cy.get('input[name="email"]').type('test.noschedule@sushigo.com', { force: true })

    // Select a position
    cy.contains('label', 'Cocinero').find('[role="switch"]').click({ force: true })

    // force: true required — the submit button may be outside the slide panel's overflow-y-auto
    // visible area; all other form elements in this panel also use { force: true }
    cy.contains('button', 'Crear').click({ force: true })

    // Wait for detail view
    cy.contains('Test NoSchedule', { timeout: 10_000 }).scrollIntoView().should('be.visible')

    // Should have "Agregar horario" button instead of "Ver horario"
    cy.contains('button', 'Agregar horario').should('be.visible')

    // Click to open dialog
    cy.contains('button', 'Agregar horario').click()

    // Dialog opens in create mode — title is "Nuevo horario", no tabs
    cy.contains('Nuevo horario', { timeout: 5_000 }).should('be.visible')

    // There should be no History tab visible when no schedule exists
    cy.contains('button', 'Historial').should('not.exist')

    // Close dialog via the slide-panel X button
    cy.contains('Close panel').parent().click({ force: true })
  })
})
