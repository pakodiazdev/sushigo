/**
 * Attendance Overtime Decision — E2E happy path tests
 *
 * Covers two flows for the overtime decision UI:
 *   1. AUTHORIZE: Manager checks out EMP-001 at 22:35 (35 min overtime)
 *      → clicks "Decidir horas extra" → clicks "Pagar horas extra"
 *      → card shows "Pagadas" badge.
 *
 *   2. REJECT: Manager checks out EMP-002 at 22:35 (35 min overtime)
 *      → clicks "Decidir horas extra" → clicks "No pagar"
 *      → card shows "No pagadas" badge.
 *
 * Shift schedule (seeded for all employees):
 *   expected_start = 13:00 local (America/Mexico_City)
 *   expected_end   = 22:00 local
 *   lunch_duration = 30 min staggered
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file (~3-5s).
 * • beforeEach() → login via API + navigate to /attendance/today.
 * • Each describe uses a DISTINCT employee — no slot reuse.
 *
 * Employees used:
 *   EMP-001  Mendoza, Carlos   → authorize overtime (Pagar)
 *   EMP-002  García, María     → reject overtime (No pagar)
 *
 * To run only this file:
 *   make cypress-spec SPEC=attendance-overtime-decision
 *   make cypress-debug SPEC=attendance-overtime-decision
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

before(() => {
  cy.task("test:reset", "attendance", { timeout: 60_000 });
});

// Test time: 22:35 CDMX — after shift end (22:00), yields 35 min overtime on check-out at 22:35
const TEST_TIME_ISO = "2026-04-02T22:35:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-03T04:35:00Z");

beforeEach(() => {
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  cy.loginByApi(adminEmail, adminPassword);
  cy.visitWithAuth("/attendance/today");
  cy.url().should("include", "/attendance/today", { timeout: 10_000 });
  cy.closeDevDebugger();

  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the employee card element for the given lastName, firstName.
 */
function getCard(lastName: string, firstName: string) {
  return cy
    .contains("p", `${lastName}, ${firstName}`)
    .closest("div.rounded-xl");
}

/**
 * Opens an attendance time dialog for a card action button and submits a time.
 */
function submitTimeDialog(
  cardLocator: () => Cypress.Chainable,
  buttonText: string,
  time: string,
  confirmButtonText: string
) {
  cy.intercept("PATCH", "**/attendances/**").as("attendancePatch");
  cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

  cardLocator().within(() => {
    cy.contains("button", buttonText).scrollIntoView().click();
  });

  cy.get("input[type='time']").should("be.visible").clear().type(time);
  cy.contains("button", confirmButtonText).click();

  cy.wait("@attendancePatch");
  cy.wait("@refetchAttendance");
}

/**
 * Full attendance setup for an employee: check-in → lunch start → lunch return → check-out.
 * Returns after check-out mutation is confirmed so overtime button is visible.
 */
function setupAttendanceWithOvertime(lastName: string, firstName: string) {
  // 1. Check-in at 13:00
  submitTimeDialog(
    () => getCard(lastName, firstName),
    "Registrar entrada",
    "13:00",
    "Confirmar entrada"
  );

  // 2. Lunch start at 16:00
  submitTimeDialog(
    () => getCard(lastName, firstName),
    "Salir a comer",
    "16:00",
    "Confirmar salida"
  );

  // 3. Lunch return at 16:30
  submitTimeDialog(
    () => getCard(lastName, firstName),
    "Regresar de comida",
    "16:30",
    "Confirmar regreso"
  );

  // 4. Check-out at 22:35 — 35 min overtime (shift ends 22:00)
  submitTimeDialog(
    () => getCard(lastName, firstName),
    "Registrar salida",
    "22:35",
    "Confirmar salida"
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Authorize overtime (Pagar)
// ══════════════════════════════════════════════════════════════════════════════

describe("Overtime Decision — Authorize (Pagar)", () => {
  it("autoriza las horas extra de Carlos Mendoza y muestra badge Pagadas", () => {
    setupAttendanceWithOvertime("Mendoza", "Carlos");

    // After check-out, the overtime decision button should appear
    getCard("Mendoza", "Carlos").within(() => {
      cy.get("[data-testid='btn-overtime-decision']", { timeout: 10_000 })
        .should("be.visible")
        .and("contain", "35 min");
    });

    // Intercept the overtime-decision PATCH
    cy.intercept("PATCH", "**/attendances/**/overtime-decision").as("overtimeDecision");
    cy.intercept("GET", "**/attendances/today*").as("refetchAfterDecision");

    // Open the overtime decision dialog
    getCard("Mendoza", "Carlos")
      .find("[data-testid='btn-overtime-decision']")
      .click();

    // Dialog should be visible
    cy.contains("Decisión de horas extra").should("be.visible");
    cy.contains("Carlos Mendoza").should("be.visible");
    cy.contains("35 min extra").should("be.visible");

    // Click "Pagar horas extra"
    cy.get("[data-testid='btn-authorize-overtime']").click();

    cy.wait("@overtimeDecision").its("response.statusCode").should("eq", 200);
    cy.wait("@refetchAfterDecision");

    // Card should now show the "Pagadas" badge
    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("Pagadas", { timeout: 10_000 }).should("be.visible");
      cy.get("[data-testid='btn-overtime-decision']").should("not.exist");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Reject overtime (No pagar)
// ══════════════════════════════════════════════════════════════════════════════

describe("Overtime Decision — Reject (No pagar)", () => {
  it("rechaza las horas extra de María García y muestra badge No pagadas", () => {
    setupAttendanceWithOvertime("García", "María");

    // After check-out, the overtime decision button should appear
    getCard("García", "María").within(() => {
      cy.get("[data-testid='btn-overtime-decision']", { timeout: 10_000 })
        .should("be.visible")
        .and("contain", "35 min");
    });

    // Intercept the overtime-decision PATCH
    cy.intercept("PATCH", "**/attendances/**/overtime-decision").as("overtimeDecision");
    cy.intercept("GET", "**/attendances/today*").as("refetchAfterDecision");

    // Open the overtime decision dialog
    getCard("García", "María")
      .find("[data-testid='btn-overtime-decision']")
      .click();

    // Dialog should be visible
    cy.contains("Decisión de horas extra").should("be.visible");
    cy.contains("María García").should("be.visible");
    cy.contains("35 min extra").should("be.visible");

    // Click "No pagar"
    cy.get("[data-testid='btn-reject-overtime']").click();

    cy.wait("@overtimeDecision").its("response.statusCode").should("eq", 200);
    cy.wait("@refetchAfterDecision");

    // Card should now show the "No pagadas" badge
    getCard("García", "María").within(() => {
      cy.contains("No pagadas", { timeout: 10_000 }).should("be.visible");
      cy.get("[data-testid='btn-overtime-decision']").should("not.exist");
    });
  });
});
