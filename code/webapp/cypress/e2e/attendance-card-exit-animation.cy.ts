/**
 * Attendance Card Exit Animation — E2E happy-path tests
 *
 * Covers the fade/slide-out animation + grid reflow that plays when an
 * action (check-in, mark-falta) moves an employee's card out of the
 * currently active tab. Existing specs (attendance-checkin.cy.ts,
 * attendance-day-status.cy.ts) force the "Total" tab in their setup, which
 * means a card never actually needs to leave the grid there — this spec
 * deliberately stays on the default "Pendientes" tab so the exit path is
 * genuinely exercised.
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 * • beforeEach() → login via API + navigate to /attendance.
 * • Each it() uses a DIFFERENT employee — no slot is reused.
 *
 * Employees used (EMP-001..EMP-008 seeded via config/seeders.php):
 *   EMP-001  Mendoza, Carlos   → check-in, leaves "Pendientes"
 *   EMP-002  García, María     → mark-falta, leaves "Pendientes"
 *
 * The date-switch-mid-mutation race (a stale response landing after the
 * manager already switched dates) is deliberately NOT covered here — per
 * this repo's testing strategy (CLAUDE.md § Testing Strategy, and
 * doc/conventions/testing/testing-strategy.md Layer 3), Cypress is reserved
 * for happy-path E2E only; edge cases/race conditions belong in Vitest. See
 * "does not animate an unrelated card on the newly selected date if the
 * manager switches dates while a check-in is still in flight" in
 * use-today-attendance-page.test.ts for that coverage.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-card-exit-animation
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

before(() => {
  cy.task("test:reset", "attendance", { timeout: 60_000 });
});

// Test time: 14:30 CDMX
const TEST_TIME_ISO = "2026-04-02T14:30:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-02T20:30:00Z");

beforeEach(() => {
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  cy.loginByApi(adminEmail, adminPassword);
  cy.visitWithAuth("/attendance");
  cy.url().should("include", "/attendance", { timeout: 10_000 });
  cy.closeDevDebugger();

  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);

  // Deliberately do NOT force the "Total" tab here — the smart default lands
  // on "Pendientes", which is exactly the tab an action needs to move a card
  // OUT of for the exit animation to be observable.
  cy.contains("[data-testid^='stat-']", "Pendientes", { timeout: 10_000 }).should("be.visible");
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCard(lastName: string, firstName: string) {
  return cy
    .contains("p", `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest("div.rounded-xl")
    .scrollIntoView();
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Check-in moves the card out of "Pendientes"
// ══════════════════════════════════════════════════════════════════════════════

describe("Card exit animation — check-in", () => {
  it("removes Carlos from Pendientes after check-in, and shows him under En trabajo", () => {
    cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

    getCard("Mendoza", "Carlos")
      .contains("button", "Registrar entrada")
      .click({ force: true });

    cy.get("#checkin-time").clear({ force: true }).type("13:00", { force: true });
    cy.contains("button", "Confirmar entrada").should("not.be.disabled").click();
    cy.wait("@refetchAttendance", { timeout: 10_000 });

    // Card leaves the "Pendientes" tab once the exit animation finishes.
    cy.contains("p", "Mendoza, Carlos", { timeout: 10_000 }).should("not.exist");

    // Reappears, checked in, under "En trabajo".
    cy.contains("[data-testid^='stat-']", "En trabajo").click({ force: true });
    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Mark-falta (decline justify-now) moves the card out of "Pendientes"
// ══════════════════════════════════════════════════════════════════════════════

describe("Card exit animation — mark-falta", () => {
  it("removes María from Pendientes after marking falta, and shows her under Ausentes", () => {
    cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

    getCard("García", "María")
      .find("[data-testid='btn-mark-falta']")
      .click({ force: true });

    cy.contains("¿Confirmar falta?").should("be.visible");
    cy.contains("button", "Confirmar falta").click({ force: true });
    cy.wait("@refetchAttendance", { timeout: 10_000 });

    cy.contains("¿Deseas justificar la falta ahora?", { timeout: 10_000 }).should("be.visible");
    cy.contains("button", "Ahora no").click({ force: true });

    // Card leaves "Pendientes" once the exit animation finishes.
    cy.contains("p", "García, María", { timeout: 10_000 }).should("not.exist");

    // Reappears, marked as Falta, under "Ausentes".
    cy.contains("[data-testid^='stat-']", "Ausentes").click({ force: true });
    getCard("García", "María").within(() => {
      cy.contains("Falta", { timeout: 10_000 }).should("be.visible");
    });
  });
});
