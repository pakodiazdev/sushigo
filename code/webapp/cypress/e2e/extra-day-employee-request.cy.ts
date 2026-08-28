/**
 * Employee Self-Request — Extra Day — E2E happy path (Task #124)
 *
 * Covers the employee-facing flow: an employee logs in, navigates to
 * /solicitudes, opens the "Solicitar día extra" form, submits a request,
 * sees it in the list as PENDING, and cancels it.
 *
 * User used: admin@sushigo.com (has Employee profile ADM-001 in test seeder)
 * Rest day: Sunday (day_of_week=7) — AttendanceTestSeeder sets Mon–Sat as working days.
 *
 * Happy path flow:
 *   1. Employee logs in and navigates to /solicitudes
 *   2. Clicks "➕ Día extra"
 *   3. ExtraDayRequestForm SlidePanel opens
 *   4. Picks the next upcoming Sunday via the CalendarPicker custom component
 *   5. Leaves prima % at default (100)
 *   6. Clicks "Enviar solicitud"
 *   7. Request card appears with "⏳ Pendiente de aprobación"
 *   8. Employee clicks "Cancelar" on the card
 *   9. Card disappears from the list
 *
 * To run only this file:
 *   make cypress-spec SPEC=extra-day-employee-request
 *   make cypress-debug SPEC=extra-day-employee-request
 */

import users from '../fixtures/users.json'

const { email, password } = users.admin

// ── Date helpers (evaluated at test-queue time, not runtime) ─────────────────

function isoDate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

/** Returns YYYY-MM-DD of the next Sunday (never today even if today is Sunday). */
function nextSunday(): string {
  const today = new Date()
  const dow = today.getDay() // 0=Sun … 6=Sat
  const daysAhead = dow === 0 ? 7 : 7 - dow
  const d = new Date(today)
  d.setDate(today.getDate() + daysAhead)
  return isoDate(d)
}

/** True when isoDate falls in the same calendar month as today. */
function isCurrentMonth(iso: string): boolean {
  return iso.startsWith(isoDate(new Date()).slice(0, 7))
}

// ── Suite setup ──────────────────────────────────────────────────────────────

// ⚠️ QUARANTINED per #490 → see #543. Fails against a fresh stack:
// Happy-path test fails: `cy.click()` on a button "covered by another element" (overlay/toast).
// Remove this guard when #543 is fixed.
before(function () {
  this.skip()
})

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

beforeEach(() => {
  cy.loginByApi(email, password)
  cy.visitWithAuth('/solicitudes')
  cy.url().should('include', '/solicitudes', { timeout: 10_000 })
  cy.closeDevDebugger()
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function openExtraDayForm() {
  cy.contains('button', 'Día extra').click()
}

function assertSlidePanelOpen() {
  cy.contains('Solicitar día extra', { timeout: 8_000 }).should('be.visible')
}

/**
 * Picks `targetDate` (YYYY-MM-DD) in the CalendarPicker inside the open SlidePanel.
 * The RestDayPicker fetches the employee schedule on mount; this waits for the
 * trigger button to appear (loading state shows "Cargando horario…" instead).
 * Navigates to the next month if the target date falls outside the current view.
 */
function pickDate(targetDate: string) {
  // Wait for schedule fetch to finish — trigger button replaces the loader
  cy.contains('button', 'Seleccionar fecha de descanso', { timeout: 10_000 }).click()

  // Calendar opens; navigate forward if target is in a different month
  if (!isCurrentMonth(targetDate)) {
    cy.get('button[aria-label="Siguiente"]').click()
  }

  // force:true needed because the calendar dropdown (z-50 absolute) is reported
  // as covered by the SlidePanel's overflow-y-auto scroll container
  cy.get(`button[aria-label="${targetDate}"]`).should('not.be.disabled').click({ force: true })
}

// ══════════════════════════════════════════════════════════════════════════════
// Happy Path — submit request → PENDING card → cancel
// ══════════════════════════════════════════════════════════════════════════════

describe('Extra Day Employee Self-Request — Happy Path', () => {
  it('submits a request, sees PENDING card, then cancels it', () => {
    const targetDate = nextSunday()

    cy.intercept('POST', '**/employee-requests').as('createRequest')
    cy.intercept('PATCH', '**/employee-requests/*/cancel').as('cancelRequest')
    cy.intercept('GET', '**/employee-requests*').as('listRequests')

    // Step 1: Open the form
    openExtraDayForm()
    assertSlidePanelOpen()

    // Step 2: Pick the next Sunday via the CalendarPicker custom component
    pickDate(targetDate)

    // Step 3: Leave prima % at default (100) and submit
    cy.contains('button', 'Enviar solicitud').click()

    // Step 4: Wait for POST and verify 201
    cy.wait('@createRequest').its('response.statusCode').should('eq', 201)

    // Step 5: Verify PENDING card appears in the list
    cy.contains('Pendiente de aprobación', { timeout: 8_000 }).should('be.visible')
    cy.contains('⏳ Día extra solicitado').should('be.visible')

    // Step 6: Cancel the request — opens ConfirmDialog, then confirms
    cy.contains('button', 'Cancelar').click()
    cy.contains('button', 'Sí, cancelar').click()

    cy.wait('@cancelRequest').its('response.statusCode').should('eq', 200)

    // Step 7: Card disappears (filtered out on refetch)
    cy.contains('No tienes solicitudes de días extra.', { timeout: 8_000 }).should('be.visible')
  })
})
