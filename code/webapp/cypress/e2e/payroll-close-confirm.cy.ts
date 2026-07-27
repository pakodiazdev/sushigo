/**
 * Payroll Close Confirm — E2E tests
 *
 * Covers the happy path for confirming a weekly payroll close:
 *   1. Manager navigates to /attendance/payroll/close (targets the oldest unclosed week,
 *      auto-calculated — not necessarily "this calendar week", see below)
 *   2. The preview loads automatically on mount — no "Calcular preview" button
 *   3. Clicks "Confirmar cierre" (enabled — clock is frozen at Sunday >= 19:00)
 *   4. Confirms in the dialog
 *   5. Verifies success toast and redirect to the payroll periods list (/attendance/payroll)
 *   6. Verifies returning to the close page shows the FOLLOWING week's preview instead
 *      of the one just closed (the current week already has a pay period)
 *
 * Also covers:
 *   - the close-gate UX: before Sunday 19:00, the button is disabled and the "?" icon opens
 *     a dialog explaining the weekly-close rules.
 *   - the "missed week" case: the page always targets the week right after the most recently
 *     closed period, not just whatever week the calendar says is "current" — otherwise a
 *     week nobody closed in time would be silently skipped forever the moment the calendar
 *     moves on to the next one. An overdue week's own gate has no upper bound, so it stays
 *     closeable whenever someone gets to it.
 *   - overdue navigation: "«"/"»" arrows let a manager reach other pending weeks (and the
 *     actual current week) without needing to close them in order. The gate exists to stop
 *     closing a period before ITS OWN weekend is over, not to force closing in sequence — so
 *     any past week is closeable via "Confirmar cierre" regardless of whether it's the oldest
 *     unclosed one, and only the actual current week (whose own Sunday hasn't arrived) stays
 *     gated.
 *
 * Pre-seeded data (via test:reset --seeders=payroll-preview):
 *   - CoreTestSeeder: branch MAIN, admin user (admin@sushigo.com / admin123456)
 *   - PayrollPreviewSeeder: PAY-001 Ana Payroll & PAY-002 Carlos Nomina
 *     Each employee: Mon–Fri WORKED 08:00–17:00, hourly_rate=100, weekly_scheduled_hours=48
 *     for week 2026-06-22..2026-06-28
 *
 * Each describe block freezes the clock (X-Test-Time header + cy.clock(),
 * same dual-clock pattern as `attendance-close-day-overtime.cy.ts`) at a
 * different instant WITHIN the seeded week, so the auto-calculated current
 * week always matches the seeded period:
 *   - "happy path"        → Sunday 2026-06-28 20:00 (past the close gate)
 *   - "close gate closed" → Wednesday 2026-06-24 12:00 (before the gate)
 *
 * To run only this spec:
 *   make cypress-spec SPEC=payroll-close-confirm
 */

const PERIOD_START = '2026-06-22'
const PERIOD_END = '2026-06-28'

function visitClosePageAndWaitForPreview(alias: string) {
  cy.intercept('GET', '**/pay-periods/preview**').as(alias)
  cy.visitWithAuth('/attendance/payroll/close')
  cy.contains('h1, h2', 'Cierre de Nómina').should('be.visible')
  cy.closeDevDebugger()
  cy.wait(`@${alias}`)
}

describe('Payroll Close Confirm — happy path', () => {
  const TEST_TIME_ISO = '2026-06-28T20:00:00-06:00'
  const TEST_TIME_UTC = new Date('2026-06-29T02:00:00Z')

  beforeEach(() => {
    cy.task('test:reset', 'payroll-preview')

    // Mock Date BEFORE visiting so the auto-calculated current week is correct on first render.
    cy.clock(TEST_TIME_UTC.getTime(), ['Date'])

    cy.intercept({ url: /\/api\/v1\// }, (req) => {
      req.headers['X-Test-Time'] = TEST_TIME_ISO
      req.continue()
    }).as('apiWithTestTime')

    cy.loginByApi('admin@sushigo.com', 'admin123456')
    visitClosePageAndWaitForPreview('preview')
  })

  it('confirms the close and redirects to the payroll periods list', () => {
    cy.intercept('POST', '**/pay-periods').as('confirmClose')

    // Normal flow, current week — no overdue notice.
    cy.get('[data-testid="overdue-period-notice"]').should('not.exist')

    cy.contains('button', 'Confirmar cierre').should('not.be.disabled').click()
    cy.get('[role="alertdialog"]').should('be.visible')
    cy.contains('[role="alertdialog"]', PERIOD_START).should('be.visible')
    cy.contains('[role="alertdialog"]', PERIOD_END).should('be.visible')

    cy.contains('[role="alertdialog"] button', 'Confirmar y cerrar').click()
    cy.wait('@confirmClose').its('response.statusCode').should('eq', 201)

    cy.contains('cierre').should('be.visible')
    cy.location('pathname').should('eq', '/attendance/payroll')
    cy.contains('h1, h2', 'Periodos de Nómina').should('be.visible')
  })

  it('shows the following week after returning to a page whose current week is already closed', () => {
    cy.intercept('POST', '**/pay-periods').as('confirmClose')

    cy.contains('button', 'Confirmar cierre').click()
    cy.contains('[role="alertdialog"] button', 'Confirmar y cerrar').click()
    cy.wait('@confirmClose').its('response.statusCode').should('eq', 201)

    cy.location('pathname').should('eq', '/attendance/payroll')
    visitClosePageAndWaitForPreview('nextWeekPreview')

    cy.get('[data-testid="current-week-label"]')
      .should('contain.text', '29 jun')
      .and('contain.text', '5 jul 2026')

    // The following week's gate hasn't opened yet — confirming it is disabled.
    cy.contains('button', 'Confirmar cierre').should('be.disabled')
  })
})

describe('Payroll Close Confirm — missed week (oldest unclosed, not calendar-current)', () => {
  const TEST_TIME_ISO = '2026-07-08T12:00:00-06:00'
  const TEST_TIME_UTC = new Date('2026-07-08T18:00:00Z')

  beforeEach(() => {
    // 9 weeks already CLOSED, most recently 2026-06-22..2026-06-28 — simulates payroll close
    // being skipped for a week (an exceptional case, since Sunday is normally the payday
    // commitment), so by the time "today" is Wed 2026-07-08 the calendar-current week
    // (2026-07-06..2026-07-12) is NOT what should be shown.
    cy.task('test:reset', 'payroll-closed-period')

    cy.clock(TEST_TIME_UTC.getTime(), ['Date'])

    cy.intercept({ url: /\/api\/v1\// }, (req) => {
      req.headers['X-Test-Time'] = TEST_TIME_ISO
      req.continue()
    }).as('apiWithTestTime')

    cy.loginByApi('admin@sushigo.com', 'admin123456')
  })

  it('targets the week right after the most recently closed period, not the calendar-current week', () => {
    visitClosePageAndWaitForPreview('missedWeekPreview')

    // The oldest unclosed week (2026-06-29..2026-07-05), NOT the calendar-current week
    // (2026-07-06..2026-07-12).
    cy.get('[data-testid="current-week-label"]')
      .should('contain.text', '29 jun')
      .and('contain.text', '5 jul 2026')

    // Exactly one week (this one) is overdue — the calendar-current week hasn't happened yet.
    cy.get('[data-testid="overdue-period-notice"]')
      .should('be.visible')
      .and('contain.text', 'vencido')
      .and('contain.text', 'único periodo pendiente')

    // Its own Sunday-19:00 gate is already well in the past, so it's closeable now.
    cy.contains('button', 'Confirmar cierre').should('not.be.disabled')
  })

  it('actually closes the overdue past week — not just an enabled-looking button', () => {
    visitClosePageAndWaitForPreview('missedWeekPreview')
    cy.intercept('POST', '**/pay-periods').as('confirmClose')

    cy.contains('button', 'Confirmar cierre').click()
    cy.get('[role="alertdialog"]').should('be.visible')
    cy.contains('[role="alertdialog"]', '2026-06-29').should('be.visible')
    cy.contains('[role="alertdialog"]', '2026-07-05').should('be.visible')

    cy.contains('[role="alertdialog"] button', 'Confirmar y cerrar').click()
    // The backend gate (no upper bound on how late) accepts it too, not just the UI.
    cy.wait('@confirmClose').its('response.statusCode').should('eq', 201)

    cy.location('pathname').should('eq', '/attendance/payroll')
  })

  it('lets the manager peek at the actual current week, correctly gated by ITS OWN deadline', () => {
    visitClosePageAndWaitForPreview('missedWeekPreview')

    cy.get('[data-testid="btn-view-older-period"]').should('be.disabled')
    cy.get('[data-testid="btn-view-newer-period"]').should('not.be.disabled')

    cy.intercept('GET', '**/pay-periods/preview**').as('nextPreview')
    cy.get('[data-testid="btn-view-newer-period"]').click()
    cy.wait('@nextPreview')

    // Now viewing the actual current week (2026-07-06..2026-07-12) — its own Sunday (2026-07-12)
    // hasn't happened yet at the frozen "now" (2026-07-08), so it's correctly gated — not because
    // of navigation, but because THIS week's own deadline hasn't arrived.
    cy.get('[data-testid="current-week-label"]')
      .should('contain.text', '6 jul')
      .and('contain.text', '12 jul 2026')
    cy.get('[data-testid="btn-view-newer-period"]').should('be.disabled')
    cy.contains('button', 'Confirmar cierre').should('be.disabled')
    cy.contains('Disponible a partir del domingo 19:00 hrs.').should('be.visible')

    // The overdue notice must NOT show here — this week isn't overdue, it's just not open yet.
    // Showing "vencido... puedes cerrarlo directamente" next to a disabled button would
    // contradict the disabled state right above it.
    cy.get('[data-testid="overdue-period-notice"]').should('not.exist')

    cy.intercept('GET', '**/pay-periods/preview**').as('backToOldest')
    cy.get('[data-testid="btn-view-older-period"]').click()
    cy.wait('@backToOldest')

    // Back on the oldest overdue week — closeable again, and the notice is back too.
    cy.get('[data-testid="current-week-label"]')
      .should('contain.text', '29 jun')
      .and('contain.text', '5 jul 2026')
    cy.contains('button', 'Confirmar cierre').should('not.be.disabled')
    cy.get('[data-testid="overdue-period-notice"]').should('be.visible')
  })
})

describe('Payroll Close Confirm — closing an overdue week out of order', () => {
  const TEST_TIME_ISO = '2026-07-15T12:00:00-06:00'
  const TEST_TIME_UTC = new Date('2026-07-15T18:00:00Z')

  beforeEach(() => {
    // Same 9 historical closed weeks, but "today" is 3 weeks past the latest one (2026-06-28),
    // so there are TWO overdue weeks (2026-06-29..2026-07-05 and 2026-07-06..2026-07-12) before
    // the actual current week (2026-07-13..2026-07-19).
    cy.task('test:reset', 'payroll-closed-period')

    cy.clock(TEST_TIME_UTC.getTime(), ['Date'])

    cy.intercept({ url: /\/api\/v1\// }, (req) => {
      req.headers['X-Test-Time'] = TEST_TIME_ISO
      req.continue()
    }).as('apiWithTestTime')

    cy.loginByApi('admin@sushigo.com', 'admin123456')
  })

  it('closes the second overdue week without closing the oldest one first', () => {
    visitClosePageAndWaitForPreview('oldestPreview')

    cy.get('[data-testid="overdue-period-notice"]').should('contain.text', 'hay 2 periodos pendientes')

    cy.intercept('GET', '**/pay-periods/preview**').as('secondOverduePreview')
    cy.get('[data-testid="btn-view-newer-period"]').click()
    cy.wait('@secondOverduePreview')

    cy.get('[data-testid="current-week-label"]')
      .should('contain.text', '6 jul')
      .and('contain.text', '12 jul 2026')

    // Its own Sunday-19:00 already passed too — closeable even though it isn't the oldest.
    cy.contains('button', 'Confirmar cierre').should('not.be.disabled')

    cy.intercept('POST', '**/pay-periods').as('confirmClose')
    cy.contains('button', 'Confirmar cierre').click()
    cy.contains('[role="alertdialog"]', '2026-07-06').should('be.visible')
    cy.contains('[role="alertdialog"]', '2026-07-12').should('be.visible')
    cy.contains('[role="alertdialog"] button', 'Confirmar y cerrar').click()

    cy.wait('@confirmClose').its('response.statusCode').should('eq', 201)
    cy.location('pathname').should('eq', '/attendance/payroll')
  })

  it('still targets the older skipped week after closing a newer overdue week out of order', () => {
    // Regression: the "next target" used to be derived from whichever PayPeriod had the
    // latest period_start. Closing the SECOND overdue week directly made IT the latest period,
    // which made the page think everything up to it was caught up — silently hiding the older,
    // still-unclosed week with no way left in the UI to ever reach it again.
    visitClosePageAndWaitForPreview('oldestPreview')

    cy.intercept('GET', '**/pay-periods/preview**').as('secondOverduePreview')
    cy.get('[data-testid="btn-view-newer-period"]').click()
    cy.wait('@secondOverduePreview')

    cy.intercept('POST', '**/pay-periods').as('confirmClose')
    cy.contains('button', 'Confirmar cierre').click()
    cy.contains('[role="alertdialog"] button', 'Confirmar y cerrar').click()
    cy.wait('@confirmClose').its('response.statusCode').should('eq', 201)
    cy.location('pathname').should('eq', '/attendance/payroll')

    // Revisit the close page — the OLDEST unclosed week (2026-06-29..07-05) must still be the
    // target, not skipped just because a newer period now exists.
    visitClosePageAndWaitForPreview('afterOutOfOrderClose')

    cy.get('[data-testid="current-week-label"]')
      .should('contain.text', '29 jun')
      .and('contain.text', '5 jul 2026')

    cy.get('[data-testid="overdue-period-notice"]').should('be.visible')
    cy.contains('button', 'Confirmar cierre').should('not.be.disabled')
  })
})

describe('Payroll Close Confirm — close gate closed', () => {
  const TEST_TIME_ISO = '2026-06-24T12:00:00-06:00'
  const TEST_TIME_UTC = new Date('2026-06-24T18:00:00Z')

  beforeEach(() => {
    cy.task('test:reset', 'payroll-preview')

    // Mid-week, before Sunday 19:00 — the gate must be closed.
    cy.clock(TEST_TIME_UTC.getTime(), ['Date'])

    cy.intercept({ url: /\/api\/v1\// }, (req) => {
      req.headers['X-Test-Time'] = TEST_TIME_ISO
      req.continue()
    }).as('apiWithTestTime')

    cy.loginByApi('admin@sushigo.com', 'admin123456')
    visitClosePageAndWaitForPreview('midWeekPreview')
  })

  it('disables Confirmar cierre and shows the rules dialog', () => {
    cy.contains('button', 'Confirmar cierre').should('be.disabled')
    cy.get('[aria-label="Reglas de cierre de nómina"]').click()
    cy.contains('[role="alertdialog"]', 'Reglas de cierre de nómina').should('be.visible')
    cy.contains('[role="alertdialog"] button', 'Entendido').click()
    cy.get('[role="alertdialog"]').should('not.exist')
  })
})
