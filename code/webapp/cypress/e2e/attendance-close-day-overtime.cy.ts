/**
 * Attendance Close-Day with Overtime Decisions — E2E happy path
 *
 * Covers the full flow where the manager closes the day in bulk and
 * employees have overtime → the OvertimeDecisionDialog queue appears
 * after the panel closes, one employee at a time.
 *
 * Scenario:
 *   - EMP-005 (Sánchez, Roberto) + EMP-006 (Torres, Laura) → "returned" (no check-out)
 *   - Shift expected_end = 22:00 CDMX
 *   - Manager closes day at 22:35 → 35 min overtime for both
 *   - After close: dialog appears for Roberto → authorize (Pagar)
 *   - Dialog advances to Laura → reject (No pagar)
 *   - No more dialogs after that
 *
 * Shift schedule (seeded via AttendanceTestSeeder):
 *   expected_start = 13:00 local (America/Mexico_City)
 *   expected_end   = 22:00 local
 *
 * DB reset strategy
 * ─────────────────
 * • beforeEach() → cy.task('test:reset', 'close-day-overtime')
 *   Seeds EMP-005 + EMP-006 as "returned" — ready for close-day.
 *
 * To run only this file:
 *   make cypress-spec SPEC=attendance-close-day-overtime
 *   make cypress-debug SPEC=attendance-close-day-overtime
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

// Test time: 22:35 CDMX — 35 min past expected_end (22:00), yields 35 min overtime
const TEST_TIME_ISO = "2026-04-02T22:35:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-03T04:35:00Z");

function setupBeforeEach() {
  cy.task("test:reset", "close-day-overtime", { timeout: 60_000 });

  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  cy.loginByApi(adminEmail, adminPassword);
  cy.visitWithAuth("/attendance");
  cy.url().should("include", "/attendance", { timeout: 10_000 });
  cy.closeDevDebugger();
  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCard(lastName: string, firstName: string) {
  return cy
    .contains("p", `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest("div.rounded-xl")
    .scrollIntoView();
}

// ══════════════════════════════════════════════════════════════════════════════
// Happy path — bulk close generates overtime queue with authorize + reject
// ══════════════════════════════════════════════════════════════════════════════

describe("Close day with overtime — decision queue after bulk close", () => {
  beforeEach(() => {
    setupBeforeEach();
  });

  it("shows overtime decision dialog for each employee after bulk close and records decisions", () => {
    // ── Verify pre-seeded state ──
    getCard("Sánchez", "Roberto").within(() => {
      cy.contains("Regresó", { timeout: 10_000 }).should("be.visible");
    });
    getCard("Torres", "Laura").within(() => {
      cy.contains("Regresó", { timeout: 10_000 }).should("be.visible");
    });

    // ── Intercepts ──
    cy.intercept("POST", "**/attendances/close-day").as("closeDay");
    cy.intercept("PATCH", "**/attendances/**/overtime-decision").as("overtimeDecision");
    cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

    // ── Open close-day wizard ──
    cy.contains("button", "Cerrar día").scrollIntoView().click();

    // Should go directly to confirm step (no pending lunches)
    cy.contains("Confirmar cierre del día", { timeout: 5_000 }).should("be.visible");

    // Set close time to 22:35
    cy.get('input[type="time"]')
      .clear({ force: true })
      .type("22:35", { force: true });

    // Confirm close
    cy.contains("button", "Confirmar cierre").click();

    // Wait for the close-day API call
    cy.wait("@closeDay", { timeout: 10_000 })
      .its("response.statusCode")
      .should("eq", 200);

    cy.wait("@refetchAttendance", { timeout: 10_000 });

    // ── Assert: Panel should close and overtime dialog appears for first employee ──
    cy.contains("Decisión de horas extra", { timeout: 10_000 }).should("be.visible");
    cy.contains("35 min extra").should("be.visible");

    // ── First employee: Authorize (Pagar) ──
    cy.get("[data-testid='btn-authorize-overtime']").should("be.visible").click();

    cy.wait("@overtimeDecision", { timeout: 10_000 })
      .its("response.statusCode")
      .should("eq", 200);

    // ── Second employee: dialog advances automatically ──
    cy.contains("Decisión de horas extra", { timeout: 10_000 }).should("be.visible");
    cy.contains("35 min extra").should("be.visible");

    // Reject (No pagar) for second employee
    cy.get("[data-testid='btn-reject-overtime']").should("be.visible").click();

    cy.wait("@overtimeDecision", { timeout: 10_000 })
      .its("response.statusCode")
      .should("eq", 200);

    // ── No more dialogs after both decisions are recorded ──
    cy.contains("Decisión de horas extra").should("not.exist");

    // ── Verify: cards reflect final states ──
    // Both employees should show "Salida" after bulk check-out
    getCard("Sánchez", "Roberto").within(() => {
      cy.contains("Salida", { timeout: 10_000 }).should("be.visible");
    });
    getCard("Torres", "Laura").within(() => {
      cy.contains("Salida", { timeout: 10_000 }).should("be.visible");
    });
  });
});
