/**
 * Attendance Lunch-Return (Regreso de Comida) — E2E tests
 *
 * Covers the employee meal break return flow.
 * Pre-requisite: employee must be checked-in AND have started lunch before returning.
 *
 * Shift schedule (seeded for all employees):
 *   expected_start = 13:00 local (America/Mexico_City)
 *   expected_end   = 22:00 local
 *   lunch_duration = 60 minutes
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE por archivo (~3-5s).
 * • beforeEach() → login vía UI + navega a /attendance.
 * • Cada it() usa un EMPLEADO DISTINTO — no se reutiliza ningún slot.
 *
 * Employees used (EMP-003..EMP-004 seeded via config/seeders.php):
 *   EMP-003  López, Pedro      → check-in 13:00, lunch 14:00, return 15:00 (a tiempo)
 *   EMP-004  Ramírez, Ana      → check-in 13:00, lunch 14:00, return 15:30 (tarde)
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-lunch-return
 *   make cypress-debug SPEC=attendance-lunch-return
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

before(() => {
  cy.task("test:reset", "attendance", { timeout: 60_000 });
});

// Test time configuration: server must believe it's 16:00 CDMX so we can submit returns at 15:00-15:30
const TEST_TIME_ISO = "2026-04-02T16:00:00-06:00"; // 16:00 CDMX = server perceives as "now"
const TEST_TIME_UTC = new Date("2026-04-02T22:00:00Z"); // Same moment in UTC for frontend Date mock

beforeEach(() => {
  // Intercept ALL API requests to add X-Test-Time header so server uses our mock time
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  // Use API login to get auth storage
  cy.loginByApi(adminEmail, adminPassword);

  // Visit with auth - sets localStorage before page loads
  cy.visitWithAuth("/attendance");
  cy.url().should("include", "/attendance", { timeout: 10_000 });
  cy.closeDevDebugger();

  // Mock Date AFTER page loads to avoid interfering with auth initialization
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
function openLunchStartDialog(
  lastName: string,
  firstName: string,
  time: string,
) {
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
 * Opens the lunch-return dialog for the given employee card and submits with time.
 * Pre-requisite: employee must be in "Comida" (at-lunch) phase.
 */
function openLunchReturnDialog(
  lastName: string,
  firstName: string,
  time: string,
) {
  cy.intercept("GET", "**/attendances/today*").as("refetchReturn");

  cy.contains("p", `${lastName}, ${firstName}`)
    .closest("div.rounded-xl")
    .contains("button", "Regresar de comida")
    .scrollIntoView()
    .click({ force: true });

  cy.get("#lunch-return-time")
    .clear({ force: true })
    .type(time, { force: true });

  cy.contains("button", "Confirmar regreso")
    .should("not.be.disabled")
    .click();

  cy.wait("@refetchReturn", { timeout: 10_000 });
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
// 1. Regreso de comida — 15:00 (a tiempo)
// ══════════════════════════════════════════════════════════════════════════════

describe("Lunch-return — A tiempo (15:00)", () => {
  it("registra el regreso de comida de Pedro a las 15:00", () => {
    // Step 1: Check in the employee
    openCheckInDialog("López", "Pedro", "13:00");

    // Wait for check-in to complete
    getCard("López", "Pedro").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
    });

    // Step 2: Register lunch-start
    openLunchStartDialog("López", "Pedro", "14:00");

    // Wait for lunch-start to complete
    getCard("López", "Pedro").within(() => {
      cy.contains("Comida", { timeout: 10_000 }).should("be.visible");
    });

    // Step 3: Register lunch-return
    openLunchReturnDialog("López", "Pedro", "15:00");

    // Step 4: Verify lunch-return is visible in the card
    getCard("López", "Pedro").within(() => {
      cy.contains("Regresó", { timeout: 10_000 }).should("be.visible");
      cy.contains("Regreso comida").should("be.visible");
      // Verify the time is displayed (15:00 in some format)
      cy.contains(/3:00\s*PM|15:00/).should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Regreso de comida tarde — 15:30 (30 min de tardanza)
// ══════════════════════════════════════════════════════════════════════════════

describe("Lunch-return — Tarde (15:30)", () => {
  it("registra el regreso de comida de Ana a las 15:30 (30 min tarde)", () => {
    // Step 1: Check in the employee
    openCheckInDialog("Ramírez", "Ana", "13:00");

    // Wait for check-in to complete
    getCard("Ramírez", "Ana").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
    });

    // Step 2: Register lunch-start
    openLunchStartDialog("Ramírez", "Ana", "14:00");

    // Wait for lunch-start to complete
    getCard("Ramírez", "Ana").within(() => {
      cy.contains("Comida", { timeout: 10_000 }).should("be.visible");
    });

    // Step 3: Register lunch-return (30 min late)
    openLunchReturnDialog("Ramírez", "Ana", "15:30");

    // Step 4: Verify lunch-return is visible in the card
    getCard("Ramírez", "Ana").within(() => {
      cy.contains("Regresó", { timeout: 10_000 }).should("be.visible");
      cy.contains("Regreso comida").should("be.visible");
      // Verify the time is displayed (15:30 in some format)
      cy.contains(/3:30\s*PM|15:30/).should("be.visible");
    });
  });
});
