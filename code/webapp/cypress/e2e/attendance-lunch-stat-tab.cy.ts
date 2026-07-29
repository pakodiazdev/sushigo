/**
 * Attendance Today — "En comida" Stat Card & Tab Filter — E2E happy-path tests
 *
 * Covers issue #337: a dedicated "En comida" stat card that splits the
 * `at-lunch` phase out of the "En trabajo" bucket, and wires it into the
 * clickable tab-filter behavior introduced in #327/#336.
 *
 * Test date: 2026-04-09 (Thursday, a work day for all seeded employees)
 *
 * Employees used (seeded by AttendanceLunchStatTabSeeder):
 *   EMP-001  Mendoza, Carlos   → no attendance record (pending)          — bucket: pending
 *   EMP-002  García, María     → checked in, no lunch                    — bucket: checkedIn
 *   EMP-003  López, Pedro      → checked in, at lunch (no lunch_end)     — bucket: atLunch
 *   EMP-004  Ramírez, Ana      → checked in, lunch done ("returned")     — bucket: checkedIn
 *   EMP-005  Sánchez, Roberto  → checked out                             — bucket: done
 *
 * Since EMP-001 is pending, the page is expected to land on the "Pendientes"
 * tab by default.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-lunch-stat-tab
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ──────────────────────────────────────────────────────────────

before(() => {
  cy.task("test:reset", "attendance-lunch-stat-tab", { timeout: 60_000 });
});

// Test time: 18:00 CDMX on 2026-04-09, after every seeded event (last one is
// Sánchez's check-out at 17:00 CDMX / 23:00 UTC)
const TEST_TIME_ISO = "2026-04-09T18:00:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-10T00:00:00Z");

beforeEach(() => {
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  cy.loginByApi(adminEmail, adminPassword);
  cy.visitWithAuth("/attendance");
  cy.url().should("include", "/attendance", { timeout: 10_000 });
  // Wait for a stable page element before checking for the dev debugger —
  // calling closeDevDebugger() immediately after navigation can no-op if the
  // overlay mounts slightly later, leaving it to cover the UI mid-test.
  cy.get("[data-testid='stat-total']", { timeout: 10_000 }).should("be.visible");
  cy.closeDevDebugger();

  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);
});

// ── Helpers ──────────────────────────────────────────────────────────────────

type StatTab = "total" | "pending" | "checked-in" | "at-lunch" | "done" | "absent";

/** Clicks a stat card by its data-testid (they're buttons acting as tabs). */
function clickTab(tab: StatTab) {
  cy.get(`[data-testid='stat-${tab}']`, { timeout: 10_000 }).click({ force: true });
}

// ── Stat card ────────────────────────────────────────────────────────────────

describe("En comida stat card", () => {
  it("shows a 6th 'En comida' card counting only the at-lunch employee (López)", () => {
    cy.get("[data-testid='stat-at-lunch']", { timeout: 10_000 })
      .find("p")
      .first()
      .should("have.text", "1");
  });

  it("lays out 6 stat cards evenly (no orphan cell)", () => {
    cy.get("[data-testid='stat-at-lunch']", { timeout: 10_000 }).closest("div.grid").should("have.class", "grid-cols-3");
    cy.get("[data-testid='stat-at-lunch']").closest("div.grid").should("have.class", "sm:grid-cols-6");
  });
});

// ── Tab filter behavior ────────────────────────────────────────────────────────

describe("'En comida' as a tab", () => {
  it("clicking 'En comida' reveals only López, hiding everyone else", () => {
    clickTab("at-lunch");

    cy.contains("López", { timeout: 10_000 }).should("be.visible");
    cy.contains("Mendoza").should("not.exist");
    cy.contains("García").should("not.exist");
    cy.contains("Ramírez").should("not.exist");
    cy.contains("Sánchez").should("not.exist");
  });

  it("clicking 'En trabajo' shows García and Ramírez (checked-in + returned), but not López (at lunch)", () => {
    clickTab("checked-in");

    cy.contains("García", { timeout: 10_000 }).should("be.visible");
    cy.contains("Ramírez").should("be.visible");
    cy.contains("López").should("not.exist");
  });

  it("clicking 'Total empleados' shows literally everyone, including López", () => {
    clickTab("total");

    cy.contains("Mendoza", { timeout: 10_000 }).should("be.visible");
    cy.contains("García").should("be.visible");
    cy.contains("López").should("be.visible");
    cy.contains("Ramírez").should("be.visible");
    cy.contains("Sánchez").should("be.visible");
  });
});

// ── URL persistence ─────────────────────────────────────────────────────────────

describe("Selected 'En comida' tab persists in the URL", () => {
  it("updates the URL when 'En comida' is clicked, and restores it after a reload", () => {
    clickTab("at-lunch");
    cy.url().should("include", "tab=atLunch");

    cy.reload();
    cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);

    cy.url({ timeout: 10_000 }).should("include", "tab=atLunch");
    cy.get("[data-testid='stat-at-lunch']", { timeout: 10_000 }).should("have.attr", "aria-pressed", "true");
    cy.contains("López", { timeout: 10_000 }).should("be.visible");
  });
});
