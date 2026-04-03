/**
 * Attendance Lunch-Start (Salida a Comida) — E2E tests
 *
 * Covers the employee meal break start flow.
 * Pre-requisite: employee must be checked-in before starting lunch.
 *
 * Shift schedule (seeded for all employees):
 *   expected_start = 13:00 local (America/Mexico_City)
 *   expected_end   = 22:00 local
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('db:reset') ONCE por archivo (~90s).
 * • beforeEach() → login vía UI + navega a /attendance/today.
 * • Cada it() usa un EMPLEADO DISTINTO — no se reutiliza ningún slot.
 *
 * Employees used (EMP-001..EMP-002 seeded via config/seeders.php):
 *   EMP-001  Mendoza, Carlos   → check-in 13:00, lunch 14:00 (a tiempo)
 *   EMP-002  García, María     → check-in 13:00, lunch 13:45 (anticipado)
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-lunch-start
 *   make cypress-debug SPEC=attendance-lunch-start
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

before(() => {
  cy.task("db:reset", null, { timeout: 180_000 });
});

// Test time configuration: server must believe it's 14:30 CDMX so we can submit check-ins and lunch times
const TEST_TIME_ISO = "2026-04-02T14:30:00-06:00"; // 14:30 CDMX = server perceives as "now"
const TEST_TIME_UTC = new Date("2026-04-02T20:30:00Z"); // Same moment in UTC for frontend Date mock

beforeEach(() => {
  // Intercept ALL API requests to add X-Test-Time header so server uses our mock time
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  // Use API login to get auth storage
  cy.loginByApi(adminEmail, adminPassword);

  // Visit with auth - sets localStorage before page loads
  cy.visitWithAuth("/attendance/today");
  cy.url().should("include", "/attendance/today", { timeout: 10_000 });
  cy.closeDevDebugger();

  // Mock Date for dialogs — the dialogs use Date.now() for default time
  // but formatTime() uses new Date(iso) which cy.clock breaks
  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Opens the check-in dialog for the given employee card and submits with time.
 */
function openCheckInDialog(lastName: string, firstName: string, time: string) {
  cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

  cy.contains("p", `${lastName}, ${firstName}`)
    .closest("div.rounded-xl")
    .contains("button", "Registrar entrada")
    .scrollIntoView()
    .click({ force: true });

  cy.get("#checkin-time").clear({ force: true }).type(time, { force: true });

  cy.contains("button", "Confirmar entrada")
    .should("not.be.disabled")
    .click();

  cy.wait("@refetchAttendance", { timeout: 10_000 });
}

/**
 * Opens the lunch-start dialog for the given employee card and submits with time.
 * Pre-requisite: employee must be in "En trabajo" (checked-in) phase.
 */
function openLunchStartDialog(lastName: string, firstName: string, time: string) {
  cy.intercept("GET", "**/attendances/today*").as("refetchLunch");

  cy.contains("p", `${lastName}, ${firstName}`)
    .closest("div.rounded-xl")
    .contains("button", "Salir a comer")
    .scrollIntoView()
    .click({ force: true });

  cy.get("#lunch-time").clear({ force: true }).type(time, { force: true });

  cy.contains("button", "Confirmar salida")
    .should("not.be.disabled")
    .click();

  cy.wait("@refetchLunch", { timeout: 10_000 });
}

/**
 * Returns a Cypress chain scoped to the employee's card.
 * scrollIntoView ensures the card is in the viewport before asserting visibility.
 */
function getCard(lastName: string, firstName: string) {
  return cy
    .contains("p", `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest("div.rounded-xl")
    .scrollIntoView();
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Salida a comida — 14:00 (a tiempo)
// ══════════════════════════════════════════════════════════════════════════════

describe("Lunch-start — A tiempo (14:00)", () => {
  it("registra la salida a comida de Carlos a las 14:00", () => {
    // Step 1: First check in the employee
    openCheckInDialog("Mendoza", "Carlos", "13:00");

    // Wait for check-in to complete and card to update
    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
    });

    // Step 2: Register lunch-start
    openLunchStartDialog("Mendoza", "Carlos", "14:00");

    // Step 3: Verify lunch-start is visible in the card
    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("Comida", { timeout: 10_000 }).should("be.visible");
      cy.contains("Salida comida").should("be.visible");
      // Verify the time is displayed (14:00 format from formatTime)
      cy.contains("14:00").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Salida a comida anticipada — 13:45
// ══════════════════════════════════════════════════════════════════════════════

describe("Lunch-start — Anticipada (13:45)", () => {
  it("registra la salida a comida de María a las 13:45 (antes del horario programado)", () => {
    // Step 1: First check in the employee
    openCheckInDialog("García", "María", "13:00");

    // Wait for check-in to complete and card to update
    getCard("García", "María").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
    });

    // Step 2: Register lunch-start (earlier than scheduled)
    openLunchStartDialog("García", "María", "13:45");

    // Step 3: Verify lunch-start is visible in the card
    getCard("García", "María").within(() => {
      cy.contains("Comida", { timeout: 10_000 }).should("be.visible");
      cy.contains("Salida comida").should("be.visible");
      // Verify the time is displayed (13:45 format from formatTime)
      cy.contains("13:45").should("be.visible");
    });
  });
});
