/**
 * Attendance Extra Day Express — E2E happy path test (Task #122)
 *
 * Covers the extra day negotiation dialog that appears when a manager
 * tries to check-in an employee on their scheduled rest day (without
 * a prior agreement).
 *
 * Happy path flow:
 *   1. Manager navigates to /attendance (on a Sunday)
 *   2. Employee card shows "Descanso programado" badge
 *   3. Manager clicks "Registrar entrada"
 *   4. ExtraDayNegotiationDialog opens with defaults:
 *      - Salario registrado (default)
 *      - Prima legal 100% (default)
 *   5. Manager clicks "Aprobar y continuar"
 *   6. Check-in time dialog appears
 *   7. Manager confirms check-in time
 *   8. Card shows "En trabajo" status
 *
 * Test date: April 5, 2026 (Sunday) — day_of_week = 7 (rest day for all seeded employees)
 *
 * Employees used:
 *   EMP-001  Mendoza, Carlos — extra day express with defaults
 *
 * To run only this file:
 *   make cypress-spec SPEC=attendance-extra-day-express
 *   make cypress-debug SPEC=attendance-extra-day-express
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

before(() => {
  cy.task("test:reset", "attendance", { timeout: 60_000 });
});

// Test time: April 5, 2026 (Sunday) at 14:30 CDMX
// This is a rest day for all seeded employees (day_of_week = 7)
const TEST_TIME_ISO = "2026-04-05T14:30:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-05T20:30:00Z");

beforeEach(() => {
  // Intercept ALL API requests to add X-Test-Time header
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  cy.loginByApi(adminEmail, adminPassword);
  cy.visitWithAuth("/attendance");
  cy.url().should("include", "/attendance", { timeout: 10_000 });
  cy.closeDevDebugger();

  // Mock Date after page loads
  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);

  // This spec isn't about the stat-card tabs — reveal every employee
  // regardless of bucket (issue #327 made the default view land on a
  // single bucket tab, e.g. "Pendientes").
  cy.get("[data-testid='stat-total']", { timeout: 10_000 }).click({ force: true });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the employee card element for the given lastName, firstName.
 */
function getCard(lastName: string, firstName: string) {
  return cy
    .contains("p", `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest("div.rounded-xl")
    .scrollIntoView();
}

/**
 * Opens the extra day dialog by clicking "Registrar entrada" on a rest-day employee.
 */
function clickCheckInOnRestDayEmployee(lastName: string, firstName: string) {
  getCard(lastName, firstName).within(() => {
    // Verify the rest day badge is visible
    cy.contains("Descanso programado").should("be.visible");
    // Click check-in button
    cy.contains("button", "Registrar entrada").click();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Happy Path — Extra Day Express with default values (legal prima 100%)
// ══════════════════════════════════════════════════════════════════════════════

describe("Extra Day Express — Happy Path", () => {
  it("registers extra day with defaults and completes check-in", () => {
    // Intercepts for the mutations
    cy.intercept("POST", "**/negotiated-extra-days").as("registerExtraDay");
    cy.intercept("POST", "**/attendances/check-in").as("checkIn");
    cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

    // Step 1: Click check-in on a rest-day employee
    clickCheckInOnRestDayEmployee("Mendoza", "Carlos");

    // Step 2: Verify ExtraDayNegotiationDialog is open
    cy.get("dialog[open]").should("be.visible");
    cy.contains("h2", "Día extra express").should("be.visible");
    cy.contains("Mendoza, Carlos").should("be.visible");

    // Step 3: Verify form sections are present
    // Salary section
    cy.contains("Salario del día").should("be.visible");
    cy.get('input[name="salary_mode"]').should("exist");
    // Prima section
    cy.contains("Pago extra por trabajar en día de descanso").should("be.visible");
    cy.get('input[name="prima_mode"]').should("exist");

    // Step 4: Handle salary input based on current mode
    // When no registered wage exists, salary mode defaults to 'custom'
    // The percentage input is disabled when no wage is registered, but the amount input is enabled
    cy.get('input[name="salary_mode"][value="custom"]').then(($radio) => {
      if ($radio.is(":checked")) {
        // Custom mode is active — enter a salary amount in the "Monto ($)" field
        cy.contains("label", "Monto ($)")
          .parent()
          .find('input[type="number"]')
          .clear()
          .type("200");
      }
    });

    // Step 5: Verify summary shows calculated values
    cy.contains("Total estimado").should("be.visible");

    // Step 6: Click "Aprobar y continuar"
    cy.contains("button", "Aprobar y continuar").click();

    // Wait for extra day registration
    cy.wait("@registerExtraDay").its("response.statusCode").should("eq", 201);

    // Step 7: Check-in time dialog should appear
    cy.get("#checkin-time").should("be.visible");
    cy.contains("Registrar entrada").should("be.visible");

    // Step 8: Submit check-in time (14:30 — the test time)
    cy.get("#checkin-time").clear({ force: true }).type("14:30", { force: true });
    cy.contains("button", "Confirmar entrada").should("not.be.disabled").click();

    // Wait for check-in mutation
    cy.wait("@checkIn");
    cy.wait("@refetchAttendance", { timeout: 10_000 });

    // Step 9: Verify card now shows "En trabajo" status
    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
      cy.contains("Entrada").should("be.visible");
    });
  });
});
