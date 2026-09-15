/**
 * Attendance Day Status — E2E happy-path tests
 *
 * Covers marking an employee's day as ABSENCE (Falta) from the Today view
 * using the "Marcar falta" button + confirmation dialog.
 *
 * Note: DAY_OFF (Descanso) is now auto-managed by CloseDayAction — no manual
 * action is needed from the Today view for rest days.
 *
 * DB reset strategy
 * ─────────────────
 * • beforeEach() → cy.task('test:reset', 'attendance'), then login via API +
 *   navigate to /attendance. Each `it()` calls markFalta() on its own employee
 *   to reach the "Falta" precondition itself (see "Justificar Falta" below,
 *   which re-marks García, María as Falta even though an earlier test already
 *   left her that way) — a file-level `before()` that seeds ONCE would leave
 *   that second call with no "Marcar falta" button to click, since the first
 *   test's side effect is still on the card. A per-test reset also matches
 *   CI's retries=2: it re-runs `beforeEach()` on a retry but not a file-level
 *   `before()`, so a failed attempt's residual state would otherwise leak into
 *   the retry. See #537.
 * • Employees are shared across `it()`s (all use García, María except the
 *   "Justificar de inmediato" case) precisely because each test re-establishes
 *   its own precondition instead of relying on a previous test's leftover state.
 *
 * Employees used:
 *   EMP-002  García, María     → marked as ABSENCE (Falta)
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-day-status
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

// Test time: 14:30 CDMX
const TEST_TIME_ISO = "2026-04-02T14:30:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-02T20:30:00Z");

beforeEach(() => {
  cy.task("test:reset", "attendance", { timeout: 60_000 });

  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  // Every employee card mounts its own (hidden) RegisterLeaveDialog
  // unconditionally, and useRegisterLeaveDialog() calls useLeaveTypes()
  // un-gated by isOpen — so this GET fires once, immediately on page mount,
  // not when a test later opens the "Registrar ausencia" dialog. Registering
  // the intercept here, before the visit, is what lets cy.wait("@leaveTypesLoad")
  // reliably observe it later in a test body instead of racing an already
  // in-flight (or already-completed) request. See #537.
  cy.intercept("GET", "**/leave-types*").as("leaveTypesLoad");

  cy.loginByApi(adminEmail, adminPassword);
  cy.visitWithAuth("/attendance");
  cy.url().should("include", "/attendance", { timeout: 10_000 });
  cy.closeDevDebugger();

  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);

  // This spec isn't about the stat-card tabs — reveal every employee
  // regardless of bucket (issue #327 made the default view land on a
  // single bucket tab, e.g. "Pendientes").
  cy.get("[data-testid='stat-total']", { timeout: 10_000 }).click({ force: true });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Clicks "Marcar falta" for the given employee, confirms the dialog, then
 * declines the follow-up "¿Deseas justificar la falta ahora?" prompt so the
 * flow ends the same way it did before that prompt existed (falta marked,
 * not yet justified).
 */
function markFalta(lastName: string, firstName: string) {
  cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

  cy.contains("p", `${lastName}, ${firstName}`)
    .closest("div.rounded-xl")
    .find("[data-testid='btn-mark-falta']")
    .scrollIntoView()
    .click({ force: true });

  // Confirm dialog appears
  cy.contains("¿Confirmar falta?").should("be.visible");
  cy.contains("button", "Confirmar falta").click({ force: true });

  cy.wait("@refetchAttendance", { timeout: 10_000 });

  // Decline the immediate justify-now prompt
  cy.contains("¿Deseas justificar la falta ahora?", { timeout: 10_000 }).should("be.visible");
  cy.contains("button", "Ahora no").click({ force: true });
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
// 1. Marcar como Falta (ABSENCE)
// ══════════════════════════════════════════════════════════════════════════════

describe("Day Status — Marcar Falta (ABSENCE)", () => {
  it("marca el día de María como Falta y muestra el badge correspondiente", () => {
    markFalta("García", "María");

    getCard("García", "María").within(() => {
      cy.contains("Falta", { timeout: 10_000 }).should("be.visible");
      // Action buttons should no longer be visible once day is marked
      cy.contains("Registrar entrada").should("not.exist");
      cy.contains("Marcar falta").should("not.exist");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Justificar una Falta ya marcada — se convierte en Ausencia con el tipo elegido
// ══════════════════════════════════════════════════════════════════════════════

describe("Day Status — Justificar Falta", () => {
  it("convierte una Falta ya marcada en una Ausencia justificada", () => {
    markFalta("García", "María");

    getCard("García", "María").within(() => {
      cy.contains("Falta", { timeout: 10_000 }).should("be.visible");
    });

    cy.intercept("POST", "**/leaves").as("registerLeave");

    getCard("García", "María")
      .find("[data-testid='btn-justify-absence']")
      .scrollIntoView()
      .click({ force: true });

    cy.contains("h3", "Registrar ausencia", { timeout: 6_000 }).should("be.visible");
    cy.wait("@leaveTypesLoad");
    cy.get("dialog select").first().select("Incapacidad médica");
    cy.get("dialog").contains("button", "Registrar ausencia").click({ force: true });

    cy.wait("@registerLeave").its("response.statusCode").should("eq", 201);

    getCard("García", "María").within(() => {
      cy.contains("Ausencia", { timeout: 10_000 }).should("be.visible");
      cy.contains("Falta").should("not.exist");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Justificar la falta de inmediato — desde el prompt que sigue a "Confirmar falta"
// ══════════════════════════════════════════════════════════════════════════════

describe("Day Status — Justificar de inmediato", () => {
  it("abre el diálogo de registrar ausencia al elegir 'Justificar ahora'", () => {
    cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");
    cy.intercept("POST", "**/leaves").as("registerLeave");

    cy.contains("p", "López, Pedro")
      .closest("div.rounded-xl")
      .find("[data-testid='btn-mark-falta']")
      .scrollIntoView()
      .click({ force: true });

    cy.contains("¿Confirmar falta?").should("be.visible");
    cy.contains("button", "Confirmar falta").click({ force: true });
    cy.wait("@refetchAttendance", { timeout: 10_000 });

    cy.contains("¿Deseas justificar la falta ahora?", { timeout: 10_000 }).should("be.visible");
    cy.contains("button", "Justificar ahora").click({ force: true });

    cy.contains("h3", "Registrar ausencia", { timeout: 6_000 }).should("be.visible");
    cy.wait("@leaveTypesLoad");
    cy.get("dialog select").first().select("Incapacidad médica");
    cy.get("dialog").contains("button", "Registrar ausencia").click({ force: true });

    cy.wait("@registerLeave").its("response.statusCode").should("eq", 201);

    getCard("López", "Pedro").within(() => {
      cy.contains("Ausencia", { timeout: 10_000 }).should("be.visible");
    });
  });
});
