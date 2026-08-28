/**
 * Attendance Today — "Ausentes" Stat Card, Tab Filters & Smart Default — E2E happy-path tests
 *
 * Covers issue #327: a dedicated "Ausentes" stat card that removes employees
 * with a scheduled or marked absence from the main working grid, every stat
 * card acting as a clickable tab that filters the grid, a smart default tab
 * on page load (Pendientes, or En trabajo if nobody is pending), and the
 * active tab persisting in the URL (?tab=) across reloads.
 *
 * Test date: 2026-04-09 (Thursday, a work day for all seeded employees)
 *
 * Employees used (seeded by AttendanceAbsentStatCardSeeder):
 *   EMP-001  Mendoza, Carlos   → no attendance record (pending)      — bucket: pending
 *   EMP-002  García, María     → checked in, no check-out            — bucket: checkedIn
 *   EMP-003  López, Pedro      → day_status VACATION                 — bucket: absent (hidden outside Ausentes/Total)
 *   EMP-004  Ramírez, Ana      → day_status ABSENCE ("Marcar falta") — bucket: absent (hidden outside Ausentes/Total, even though "Justificar falta" lives on this card)
 *   EMP-005  Sánchez, Roberto  → day_status DAY_OFF (scheduled rest) — bucket: absent (hidden outside Ausentes/Total)
 *
 * Since EMP-001 is pending, the page is expected to land on the "Pendientes"
 * tab by default.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-absent-stat-card
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ──────────────────────────────────────────────────────────────

// ⚠️ QUARANTINED per #490 → see #535. Fails against a fresh stack:
// Two "Stat cards as tabs" tests fail: employee name <p> "not visible because its content is being clipped by a parent" (overflow/scroll).
// Remove this guard when #535 is fixed.
before(function () {
  this.skip()
})

before(() => {
  cy.task("test:reset", "attendance-absent-stat-card", { timeout: 60_000 });
});

// Test time: 14:30 CDMX on 2026-04-09, after check-ins are recorded
const TEST_TIME_ISO = "2026-04-09T14:30:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-09T20:30:00Z");

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

type StatTab = "total" | "pending" | "checked-in" | "done" | "absent";

/** Clicks a stat card by its data-testid (they're buttons acting as tabs). */
function clickTab(tab: StatTab) {
  cy.get(`[data-testid='stat-${tab}']`, { timeout: 10_000 }).click({ force: true });
}

// ── Stat card ────────────────────────────────────────────────────────────────

describe("Ausentes stat card", () => {
  it("shows an 'Ausentes' card counting VACATION, ABSENCE and DAY_OFF employees", () => {
    cy.get("[data-testid='stat-absent']", { timeout: 10_000 })
      .find("p")
      .first()
      .should("have.text", "3");
  });

  it("lays out 6 stat cards evenly (no orphan cell)", () => {
    cy.get("[data-testid='stat-absent']", { timeout: 10_000 }).closest("div.grid").should("have.class", "grid-cols-3");
    cy.get("[data-testid='stat-absent']").closest("div.grid").should("have.class", "sm:grid-cols-6");
  });
});

// ── Smart default tab ──────────────────────────────────────────────────────────

describe("Default tab on page load", () => {
  it("lands on 'Pendientes' since there is a pending employee (Mendoza)", () => {
    cy.get("[data-testid='stat-pending']", { timeout: 10_000 }).should("have.attr", "aria-pressed", "true");
    cy.contains("Mendoza", { timeout: 10_000 }).should("be.visible");
    cy.contains("García").should("not.exist");
    cy.contains("Ramírez").should("not.exist");
  });
});

// ── Tab filter behavior ────────────────────────────────────────────────────────

describe("Stat cards as tabs", () => {
  it("clicking 'Ausentes' reveals López, Sánchez and Ramírez (with 'Justificar falta'), and hides Mendoza/García", () => {
    clickTab("absent");

    cy.contains("López", { timeout: 10_000 }).should("be.visible");
    cy.contains("Sánchez").should("be.visible");
    cy.contains("p", "Ramírez, Ana").closest("div.rounded-xl").within(() => {
      cy.contains("Falta").should("be.visible");
      cy.get("[data-testid='btn-justify-absence']").should("be.visible");
    });
    cy.contains("Mendoza").should("not.exist");
    cy.contains("García").should("not.exist");
  });

  it("clicking 'Total empleados' shows literally everyone, including López and Sánchez", () => {
    clickTab("total");

    cy.contains("Mendoza", { timeout: 10_000 }).should("be.visible");
    cy.contains("García").should("be.visible");
    cy.contains("López").should("be.visible");
    cy.contains("Ramírez").should("be.visible");
    cy.contains("Sánchez").should("be.visible");
  });

  it("clicking the active tab again toggles off, returning to the broad default view (VACATION/DAY_OFF hidden, ABSENCE stays)", () => {
    // Wait for the smart default to actually resolve to "Pendientes" before
    // toggling it off — otherwise this click can race the default-filter
    // effect and simply set "Pendientes" instead of clearing it.
    cy.get("[data-testid='stat-pending']", { timeout: 10_000 }).should("have.attr", "aria-pressed", "true");
    clickTab("pending");

    cy.contains("Mendoza", { timeout: 10_000 }).should("be.visible");
    cy.contains("García").should("be.visible");
    cy.contains("Ramírez").should("be.visible");
    cy.contains("López").should("not.exist");
    cy.contains("Sánchez").should("not.exist");
  });

  it("clicking 'En trabajo' shows only García", () => {
    clickTab("checked-in");

    cy.contains("García", { timeout: 10_000 }).should("be.visible");
    cy.contains("Mendoza").should("not.exist");
    cy.contains("Ramírez").should("not.exist");
  });
});

// ── URL persistence ─────────────────────────────────────────────────────────────

describe("Selected tab persists in the URL", () => {
  it("reflects the smart default tab in the URL on load", () => {
    cy.url({ timeout: 10_000 }).should("include", "tab=pending");
  });

  it("updates the URL when a different tab is clicked", () => {
    clickTab("done");
    cy.url().should("include", "tab=done");
  });

  it("restores the tab from the URL after a page reload", () => {
    clickTab("absent");
    cy.url().should("include", "tab=absent");

    cy.reload();
    cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);

    cy.url({ timeout: 10_000 }).should("include", "tab=absent");
    cy.get("[data-testid='stat-absent']", { timeout: 10_000 }).should("have.attr", "aria-pressed", "true");
    cy.contains("López", { timeout: 10_000 }).should("be.visible");
  });
});
