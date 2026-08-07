/**
 * Today's Operational Report — all employee statuses
 *
 * Validates that each possible operational status is rendered correctly
 * on /attendance/reports/today using a deterministic seeded dataset.
 *
 * DB reset strategy
 * ─────────────────
 * before() → cy.task('test:reset', 'today-report-statuses') ONCE per file.
 *
 * Test date: 2026-06-18 (Thursday)
 *
 * Employee → expected status badge:
 *   EMP-001  Mendoza, Carlos   → "A tiempo"        (check-in 13:00 CDMX, on time)
 *   EMP-002  García, María     → "Tardanza 15 min" (check-in 13:15 CDMX, +15 min)
 *   EMP-003  López, Pedro      → "No registrado"   (no attendance, Thursday = work day)
 *   EMP-004  Ramírez, Ana      → "Permiso"         (approved full-day leave)
 *   EMP-005  Sánchez, Roberto  → "Descanso"        (DAY_OFF attendance record)
 *   EMP-006  Torres, Laura     → "Día de descanso" (Thursday marked as rest on schedule)
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-today-report-statuses
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task("test:reset", "today-report-statuses", { timeout: 60_000 });
});

// Test time: 14:30 CDMX on 2026-06-18, after all check-ins are recorded
const TEST_TIME_ISO = "2026-06-18T14:30:00-06:00";
const TEST_TIME_UTC = new Date("2026-06-18T20:30:00Z");

beforeEach(() => {
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  cy.loginByApi(adminEmail, adminPassword);
  cy.visitWithAuth("/attendance/reports/today");
  cy.url().should("include", "/attendance/reports/today", { timeout: 10_000 });
  cy.contains("Reporte Operacional de Hoy", { timeout: 10_000 });
  cy.closeDevDebugger();

  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);
});

// ── Status badge tests ───────────────────────────────────────────────────────

it("shows 'A tiempo' for an employee who checked in on time (EMP-001)", () => {
  cy.contains("Mendoza").scrollIntoView();
  cy.contains("Mendoza")
    .closest("tr")
    .contains("A tiempo")
    .should("be.visible");
});

it("shows 'Tardanza 15 min' for an employee who arrived late (EMP-002)", () => {
  cy.contains("García").scrollIntoView();
  cy.contains("García")
    .closest("tr")
    .contains("Tardanza 15 min")
    .should("be.visible");
});

it("shows 'No registrado' for an employee with no attendance record (EMP-003)", () => {
  cy.contains("López").scrollIntoView();
  cy.contains("López")
    .closest("tr")
    .contains("No registrado")
    .should("be.visible");
});

it("shows 'Permiso' for an employee with an approved leave (EMP-004)", () => {
  cy.contains("Ramírez").scrollIntoView();
  cy.contains("Ramírez")
    .closest("tr")
    .contains("Permiso")
    .should("be.visible");
});

it("shows 'Descanso' for an employee with a DAY_OFF attendance record (EMP-005)", () => {
  cy.contains("Sánchez").scrollIntoView();
  cy.contains("Sánchez")
    .closest("tr")
    .contains("Descanso")
    .should("be.visible");
});

it("shows 'Día de descanso' for an employee whose schedule marks today as a rest day (EMP-006)", () => {
  cy.contains("Torres").scrollIntoView();
  cy.contains("Torres")
    .closest("tr")
    .contains("Día de descanso")
    .should("be.visible");
});

// ── Table structure ──────────────────────────────────────────────────────────

it("all 6 status variants are present in the table", () => {
  cy.get('[data-testid="employee-table"]').within(() => {
    cy.contains("A tiempo").should("exist");
    cy.contains("Tardanza").should("exist");
    cy.contains("No registrado").should("exist");
    cy.contains("Permiso").should("exist");
    cy.contains("Descanso").should("exist");
    cy.contains("Día de descanso").should("exist");
  });
});
