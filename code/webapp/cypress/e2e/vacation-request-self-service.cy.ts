/**
 * Vacation Request — Self-service submit & admin approve — E2E test (Issue #082)
 *
 * Happy-path: a regular employee (EMP-002, cook role — no approve permission)
 * self-services their own vacation request from /solicitudes, exactly like a
 * Permiso — it goes through the unified employee-requests system and shows up
 * under "Pendientes de aprobación" for a manager/admin to review. An admin
 * approves it there, which materializes a real VacationRequest — verifying
 * the balance is deducted and the request also appears as APPROVED in the
 * employee's "Vacaciones" section. This is the most common flow: requester
 * and approver are different people, so the two-step PENDING→approve
 * process is genuinely exercised here.
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 *   AttendanceTestSeeder hires EMP-002 exactly 1 seniority year before "now",
 *   so opening its Vacaciones section auto-generates a 12-day entitlement
 *   (LFT year 1) for the current calendar year.
 * • beforeEach() → login via API as the employee, navigate to /solicitudes.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=vacation-request-self-service
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin
const employeeEmail = 'maria.garcia@sushigo.com'
const employeePassword = 'employee123456'
const employeeName = 'María García'

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Months forward from today's calendar month to the given ISO date's month. */
function monthsForwardFromToday(iso: string): number {
  const now = new Date()
  const target = new Date(`${iso}T00:00:00`)
  return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
}

function pickCalendarDay(iso: string) {
  const monthsToAdvance = monthsForwardFromToday(iso)
  for (let i = 0; i < monthsToAdvance; i++) {
    cy.get('[aria-label="Mes siguiente"]').click({ force: true })
  }
  cy.get(`[aria-label="${iso}"]`).click({ force: true })
}

function openEmp002Detail() {
  cy.contains('tr', 'EMP-002', { timeout: 10_000 })
    .find('button[title="Ver detalle"]')
    .click()
  cy.contains('h2', 'Detalle de Empleado', { timeout: 10_000 }).should('be.visible')
}

const today = new Date().toISOString().slice(0, 10)
// Offset well into the future to avoid colliding with today's seeded attendance,
// while staying safely within the same calendar year as the auto-generated entitlement.
const vacationDay = addDays(today, 40)

// ── Suite setup ───────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

// ══════════════════════════════════════════════════════════════════════════════
// Happy path — employee self-services → PENDING → admin approves via Solicitudes
// ══════════════════════════════════════════════════════════════════════════════

describe('Vacation Request — self-service submit & admin approve (happy path)', () => {
  it('creates a PENDING vacation request as a regular employee, then the admin approves it from Pendientes de aprobación', () => {
    // 1. Employee logs in and opens Solicitudes
    cy.loginByApi(employeeEmail, employeePassword)
    cy.visitWithAuth('/solicitudes')
    cy.url().should('include', '/solicitudes', { timeout: 10_000 })
    cy.closeDevDebugger()

    cy.intercept('POST', '**/employee-requests').as('createRequest')

    // 2. Click "Vacaciones" — self-service employee sees the "requires approval" notice
    cy.contains('h3', 'Nueva solicitud', { timeout: 10_000 }).should('be.visible')
    cy.contains('button', 'Vacaciones').click({ force: true })
    cy.contains('h2', 'Solicitar vacaciones', { timeout: 10_000 }).should('be.visible')
    cy.closeDevDebugger()
    cy.contains('requiere aprobación del Manager').should('be.visible')

    // 3. Pick a day and submit
    pickCalendarDay(vacationDay)
    cy.contains('1 día solicitado').should('be.visible')
    cy.contains('button', 'Enviar solicitud').click({ force: true })

    cy.wait('@createRequest').its('response.statusCode').should('eq', 201)

    // 4. Admin logs in and opens the Solicitudes "Pendientes de aprobación" tab
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/solicitudes')
    cy.url().should('include', '/solicitudes', { timeout: 10_000 })
    cy.closeDevDebugger()

    cy.intercept('PATCH', '**/employee-requests/*/approve').as('approveRequest')

    cy.contains('button', 'Pendientes de aprobación', { timeout: 10_000 }).click({ force: true })
    cy.contains('🌴 Vacaciones', { timeout: 10_000 }).should('be.visible')
    cy.contains(employeeName).should('be.visible')

    // 5. Admin reviews and approves it
    cy.contains('button', 'Revisar').click({ force: true })
    cy.contains('h2', /Solicitud de/, { timeout: 10_000 }).should('be.visible')
    cy.contains('button', 'Aprobar vacaciones').click({ force: true })

    cy.wait('@approveRequest').its('response.statusCode').should('eq', 200)

    // 6. The pending list no longer shows the request
    cy.contains('🌴 Vacaciones', { timeout: 10_000 }).should('not.exist')

    // 7. The materialized VacationRequest shows APPROVED and the balance is
    //    deducted (12 → 11 remaining) in the employee's Vacaciones section
    cy.visitWithAuth('/employees')
    cy.closeDevDebugger()
    openEmp002Detail()
    cy.closeDevDebugger()
    cy.contains('h3', 'Vacaciones', { timeout: 10_000 }).scrollIntoView().should('be.visible')

    cy.contains('Solicitudes de vacaciones').should('be.visible')
    cy.contains('td', 'Aprobada', { timeout: 10_000 }).should('be.visible')
    cy.contains('td', '11').should('be.visible')
  })
})
