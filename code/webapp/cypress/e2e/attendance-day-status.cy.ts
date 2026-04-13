/**
 * Attendance Day Status — E2E happy-path tests
 *
 * Covers marking an employee's day as DAY_OFF (Descanso) and ABSENCE (Falta)
 * from the Today view using the "Marcar día" dropdown.
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 * • beforeEach() → login via API + navigate to /attendance/today.
 * • Each it() uses a DIFFERENT employee — no slot is reused.
 *
 * Employees used:
 *   EMP-001  Mendoza, Carlos   → marked as DAY_OFF (Descanso)
 *   EMP-002  García, María     → marked as ABSENCE (Falta)
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-day-status
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
  cy.visitWithAuth("/attendance/today");
  cy.url().should("include", "/attendance/today", { timeout: 10_000 });
  cy.closeDevDebugger();

  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Opens the "Marcar día" dropdown for the given employee and clicks an option.
 */
function markDay(lastName: string, firstName: string, option: "Descanso" | "Falta") {
  cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

  cy.contains("p", `${lastName}, ${firstName}`)
    .closest("div.rounded-xl")
    .find("[data-testid='btn-mark-day']")
    .scrollIntoView()
    .click({ force: true });

  cy.contains("button", option).click({ force: true });

  cy.wait("@refetchAttendance", { timeout: 10_000 });
}

/**
 * Returns a Cypress chain scoped to the employee's card.
 */
function getCard(lastName: string, firstName: string) {
  return cy
    .contains("p", `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest("div.rounded-xl")
    .scrollIntoView();
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Marcar como Descanso (DAY_OFF)
// ══════════════════════════════════════════════════════════════════════════════

describe("Day Status — Marcar Descanso (DAY_OFF)", () => {
  it("marca el día de Carlos como Descanso y muestra el badge correspondiente", () => {
    markDay("Mendoza", "Carlos", "Descanso");

    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("Descanso", { timeout: 10_000 }).should("be.visible");
      // Action buttons should no longer be visible once day is marked
      cy.contains("Registrar entrada").should("not.exist");
      cy.contains("Marcar día").should("not.exist");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Marcar como Falta (ABSENCE)
// ══════════════════════════════════════════════════════════════════════════════

describe("Day Status — Marcar Falta (ABSENCE)", () => {
  it("marca el día de María como Falta y muestra el badge correspondiente", () => {
    markDay("García", "María", "Falta");

    getCard("García", "María").within(() => {
      cy.contains("Falta", { timeout: 10_000 }).should("be.visible");
      // Action buttons should no longer be visible once day is marked
      cy.contains("Registrar entrada").should("not.exist");
      cy.contains("Marcar día").should("not.exist");
    });
  });
});
