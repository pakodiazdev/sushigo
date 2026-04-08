/**
 * Attendance Close-Day (Cerrar Día) — E2E tests
 *
 * Covers the close-day wizard that batch-processes all employees at end of day.
 * Two scenarios:
 *   1. Happy path — all employees completed their flow (returned from lunch),
 *      wizard goes directly to confirm step, applies check-outs and marks absences.
 *   2. Pending lunch returns — some employees are still "at lunch" when the manager
 *      closes the day; wizard shows step 1 to resolve pending lunch returns first.
 *
 * Shift schedule (seeded for all employees):
 *   expected_start = 13:00 local (America/Mexico_City)
 *   expected_end   = 22:00 local
 *   lunch_duration = 30 minutes
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'close-day') ONCE per file.
 *   The 'close-day' group runs AttendanceTestSeeder + CloseDayTestSeeder,
 *   pre-creating attendance records so each test starts with employees
 *   already in the correct phase — no UI setup needed.
 * • beforeEach() → login via API + navigate to /attendance/today.
 * • Each it() uses DISTINCT employees — no slot reuse.
 *
 * Pre-seeded attendance records (date: 2026-04-02):
 *
 *   Test 1 (happy path — no pending lunches):
 *     EMP-005  Sánchez, Roberto  → "returned" (check-in 13:00, lunch 14:00, return 15:00)
 *     EMP-006  Torres, Laura     → "returned" (check-in 13:00, lunch 14:00, return 15:00)
 *     EMP-007  Flores, Miguel    → "pending"  (no attendance → will be ABSENCE)
 *     EMP-008  Vargas, Sofia     → "pending"  (no attendance → will be ABSENCE)
 *
 *   Test 2 (pending lunch returns):
 *     EMP-001  Mendoza, Carlos   → "at-lunch" (check-in 13:00, lunch 14:00, NO return)
 *     EMP-002  García, María     → "at-lunch" (check-in 13:00, lunch 14:00, NO return)
 *     EMP-003  López, Pedro      → "returned" (check-in 13:00, lunch 14:00, return 15:00)
 *     EMP-004  Ramírez, Ana      → "pending"  (no attendance → will be ABSENCE)
 *
 * To run only this file:
 *   make cypress-spec SPEC=attendance-close-day
 *   make cypress-debug SPEC=attendance-close-day
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

before(() => {
  cy.task("test:reset", "close-day", { timeout: 60_000 });
});

// Test time: 22:00 CDMX — end of shift, realistic close-day time
const TEST_TIME_ISO = "2026-04-02T22:00:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-03T04:00:00Z");

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

function getCard(lastName: string, firstName: string) {
  return cy
    .contains("p", `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest("div.rounded-xl")
    .scrollIntoView();
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Happy path — All employees completed their day flow
//    Wizard goes directly to confirm step (no pending lunch returns)
//    EMP-005, EMP-006 → returned | EMP-007, EMP-008 → pending (absence)
// ══════════════════════════════════════════════════════════════════════════════

describe("Close day — Happy path (no pending lunch returns)", () => {
  it("closes the day: applies check-out to returned employees and marks absences", () => {
    // ── Verify pre-seeded state ──
    getCard("Sánchez", "Roberto").within(() => {
      cy.contains("Regresó", { timeout: 10_000 }).should("be.visible");
    });

    getCard("Torres", "Laura").within(() => {
      cy.contains("Regresó", { timeout: 10_000 }).should("be.visible");
    });

    // ── Act: Open close-day wizard ──
    cy.intercept("POST", "**/attendances/close-day").as("closeDay");
    cy.intercept("GET", "**/attendances/today*").as("refetchAfterClose");

    cy.contains("button", "Cerrar día").scrollIntoView().click();

    // ── Assert: Should go directly to confirm step (no pending lunches) ──
    cy.contains("Confirmar cierre del día", { timeout: 5_000 }).should(
      "be.visible",
    );

    // Verify the summary shows employees who will get check-out
    cy.contains("Salida").should("be.visible");
    cy.contains("Roberto Sánchez").should("be.visible");
    cy.contains("Laura Torres").should("be.visible");

    // Verify absences section
    cy.contains("Falta").should("be.visible");

    // Set close time to 22:00 (end of shift)
    cy.get('input[type="time"]')
      .clear({ force: true })
      .type("22:00", { force: true });

    // Confirm close
    cy.contains("button", "Confirmar cierre").click();

    // Wait for API response
    cy.wait("@closeDay", { timeout: 10_000 })
      .its("response.statusCode")
      .should("eq", 200);

    cy.wait("@refetchAfterClose", { timeout: 10_000 });

    // ── Verify: Employees should show final states ──
    getCard("Sánchez", "Roberto").within(() => {
      cy.contains("Salida").should("be.visible");
    });

    getCard("Torres", "Laura").within(() => {
      cy.contains("Salida").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Pending lunch returns — Manager forgot to register returns
//    Wizard shows step 1 to resolve pending lunch returns first
//    EMP-001, EMP-002 → at-lunch | EMP-003 → returned | EMP-004 → pending
// ══════════════════════════════════════════════════════════════════════════════

describe("Close day — With pending lunch returns (se le pasó al encargado)", () => {
  it("resolves pending lunch returns in step 1, then confirms close in step 2", () => {
    // ── Verify pre-seeded state ──
    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("Comida", { timeout: 10_000 }).should("be.visible");
    });

    getCard("García", "María").within(() => {
      cy.contains("Comida", { timeout: 10_000 }).should("be.visible");
    });

    getCard("López", "Pedro").within(() => {
      cy.contains("Regresó", { timeout: 10_000 }).should("be.visible");
    });

    // ── Act: Open close-day wizard ──
    cy.intercept("POST", "**/attendances/close-day").as("closeDay");
    cy.intercept("GET", "**/attendances/today*").as("refetchAfterClose");

    cy.contains("button", "Cerrar día").scrollIntoView().click();

    // ── Assert Step 1: Pending lunch returns ──
    cy.contains("Paso 1 de 2", { timeout: 5_000 }).should("be.visible");
    cy.contains("Regresos de comida pendientes").should("be.visible");
    cy.contains("Estos empleados salieron a comer pero no se registró su regreso").should(
      "be.visible",
    );

    // Verify both employees with pending lunch returns appear in the table
    cy.contains("td", "Carlos Mendoza").should("be.visible");
    cy.contains("td", "María García").should("be.visible");

    // The pre-calculated return times should be shown
    // Verify time inputs are present (one per pending employee)
    cy.get('table input[type="time"]').should("have.length", 2);

    // Advance to step 2
    cy.contains("button", "Siguiente").click();

    // ── Assert Step 2: Confirm close ──
    cy.contains("Paso 2 de 2", { timeout: 5_000 }).should("be.visible");
    cy.contains("Confirmar cierre").should("be.visible");

    // Check-outs section should list employees who will get checked out
    cy.contains("Salida").should("be.visible");

    // Set close time
    cy.get('input[type="time"]')
      .clear({ force: true })
      .type("22:00", { force: true });

    // Verify we can go back to step 1
    cy.contains("button", "Anterior").click();
    cy.contains("Paso 1 de 2").should("be.visible");

    // Go forward again and confirm
    cy.contains("button", "Siguiente").click();
    cy.contains("Paso 2 de 2", { timeout: 5_000 }).should("be.visible");

    // Re-set close time (may have been cleared by navigation)
    cy.get('input[type="time"]')
      .clear({ force: true })
      .type("22:00", { force: true });

    cy.contains("button", "Confirmar cierre").click();

    // Wait for API response
    cy.wait("@closeDay", { timeout: 10_000 })
      .its("response.statusCode")
      .should("eq", 200);

    cy.wait("@refetchAfterClose", { timeout: 10_000 });

    // ── Verify: Panel should close and cards should reflect final states ──
    // Carlos and María: lunch return resolved + check-out applied
    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("Salida").should("be.visible");
    });

    getCard("García", "María").within(() => {
      cy.contains("Salida").should("be.visible");
    });

    // Pedro: was already returned, now checked out
    getCard("López", "Pedro").within(() => {
      cy.contains("Salida").should("be.visible");
    });
  });
});
