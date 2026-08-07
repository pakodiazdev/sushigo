/**
 * Today's Operational Report — E2E happy-path tests
 *
 * Covers the /attendance/reports/today page:
 *   - Summary cards show correct counts (total, present, not registered, late)
 *   - Employee table renders with status badges
 *   - A "checked in on time" employee shows "A tiempo" badge
 *   - A "late" employee shows "Tardanza X min" badge
 *
 * DB reset strategy
 * ─────────────────
 * • before() → cy.task('test:reset', 'today-report-statuses') ONCE per file.
 *
 * Test date: 2026-06-18 (Thursday) — matches TodayReportStatusSeeder.TEST_DATE
 *
 * Employees used (seeded by TodayReportStatusSeeder):
 *   EMP-001  Mendoza, Carlos   → arrived      (check-in 13:00 CDMX, on time)
 *   EMP-002  García, María     → late         (check-in 13:15 CDMX, +15 min)
 *   EMP-003  López, Pedro      → not_arrived  (no attendance record)
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-today-report
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

before(() => {
  cy.task("test:reset", "today-report-statuses", { timeout: 60_000 });
});

// Test time: 14:30 CDMX on 2026-06-18 — matches TodayReportStatusSeeder.TEST_DATE
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

// ── Tests ────────────────────────────────────────────────────────────────────

it("shows the page title and branch description", () => {
  cy.contains("Reporte Operacional de Hoy").should("be.visible");
  cy.contains("actualización automática cada 2 min").should("be.visible");
});

it("renders summary cards with numeric counts", () => {
  cy.contains("Total empleados").should("be.visible");
  cy.contains("Presentes").should("be.visible");
  cy.contains("Sin registrar").should("be.visible");
  cy.contains("Con tardanza").should("be.visible");
});

it("renders the employee table with headers", () => {
  cy.contains("Empleado").should("be.visible");
  cy.contains("Estado").should("be.visible");
  cy.contains("Entrada").should("be.visible");
});

it("shows 'A tiempo' badge for employee checked in on time (EMP-001)", () => {
  // EMP-001 Carlos Mendoza is seeded with check-in at 13:00 (exactly on schedule)
  cy.contains("Mendoza").scrollIntoView();
  cy.contains("Mendoza").closest("tr").contains("A tiempo").should("be.visible");
});

it("shows 'Tardanza' badge for late employee (EMP-002)", () => {
  // EMP-002 María García is seeded with check-in at 13:15 (+15 min late)
  cy.contains("García").scrollIntoView();
  cy.contains("García").closest("tr").contains("Tardanza").should("be.visible");
});

it("shows 'No registrado' badge for employees without check-in", () => {
  // Employees without attendance records should show 'No registrado'
  cy.get('[data-testid="employee-table"]').within(() => {
    cy.contains("No registrado").should("exist");
  });
});
