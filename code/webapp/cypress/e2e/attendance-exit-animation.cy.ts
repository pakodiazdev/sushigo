/**
 * Attendance Today — Card exit animation — E2E happy-path test
 *
 * Covers issue #357: every action that moves an employee card out of the
 * active tab (not just mark-falta) now plays the same fade/slide-out exit
 * animation, and sibling cards reflow into place (FLIP) instead of snapping.
 *
 * The existing attendance-checkin.cy.ts/attendance-lunch-*.cy.ts specs all
 * assert under the "Total empleados" tab, where every row always matches the
 * active filter (`staysInActiveTab` is unconditionally true there) — so none
 * of them ever exercise the new 'exiting'/'hidden' override path this issue
 * introduced. This spec stays on a bucket-specific tab ("Pendientes") so the
 * card genuinely needs to leave it.
 *
 * Employees used (seeded via AttendanceTestSeeder, same as attendance-checkin.cy.ts):
 *   EMP-001  Mendoza, Carlos   → no attendance record (pending)
 *   EMP-002  García, María     → no attendance record (pending)
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-exit-animation
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

before(() => {
  cy.task("test:reset", "attendance", { timeout: 60_000 });
});

const TEST_TIME_ISO = "2026-04-02T14:30:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-02T20:30:00Z");

beforeEach(() => {
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  cy.loginByApi(adminEmail, adminPassword);
  cy.visitWithAuth("/attendance");
  cy.url().should("include", "/attendance", { timeout: 10_000 });
  cy.get("[data-testid='stat-pending']", { timeout: 10_000 }).should("be.visible");
  cy.closeDevDebugger();

  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);

  // Every seeded employee starts pending, so the smart default already lands
  // here — click explicitly anyway so the test doesn't depend on that default.
  cy.get("[data-testid='stat-pending']").click({ force: true });
});

describe("Card exit animation on check-in", () => {
  it("fades/slides Carlos's card out of Pendientes, leaving María visible and unaffected", () => {
    cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

    cy.contains("p", "Mendoza, Carlos", { timeout: 10_000 })
      .closest("div.rounded-xl")
      .contains("button", "Registrar entrada")
      .scrollIntoView()
      .click({ force: true });

    cy.get("#checkin-time").clear({ force: true }).type("13:00", { force: true });
    cy.contains("button", "Confirmar entrada").should("not.be.disabled").click();

    // The exit animation plays for 350ms before the card actually leaves the
    // grid — catch it mid-flight via the CSS class startExitAnimation applies.
    cy.contains("p", "Mendoza, Carlos")
      .closest("div.rounded-xl")
      .should("have.class", "animate-card-exit");

    cy.wait("@refetchAttendance", { timeout: 10_000 });

    // Once the animation finishes, Carlos has genuinely left "Pendientes" —
    // and María (untouched by this action) is still right where she was.
    cy.contains("Mendoza, Carlos", { timeout: 10_000 }).should("not.exist");
    cy.contains("García, María").scrollIntoView().should("be.visible");

    // Confirm Carlos actually landed in "En trabajo", not just vanished.
    cy.get("[data-testid='stat-checked-in']").click({ force: true });
    cy.contains("p", "Mendoza, Carlos", { timeout: 10_000 })
      .closest("div.rounded-xl")
      .scrollIntoView()
      .within(() => {
        cy.contains("En trabajo").should("be.visible");
      });
  });
});
