/**
 * Attendance Correction — E2E Happy Path
 *
 * Covers issue #328: correcting an already-recorded attendance event
 * (check-in, lunch-start, lunch-return, check-out) via the pencil affordance
 * next to each recorded time in the employee card, instead of only being able
 * to fill in a transition that hasn't happened yet (see #83).
 *
 * Shift schedule (seeded for all employees):
 *   expected_start = 13:00 local (America/Mexico_City)
 *   expected_end   = 22:00 local
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE per file.
 * • Each test uses a DIFFERENT employee — no slot is reused.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-correction
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

before(() => {
  cy.task("test:reset", "attendance", { timeout: 60_000 });
});

// Test time configuration: server must believe it's 21:00 CDMX so the full
// check-in → lunch-start → lunch-return → check-out flow fits before "now".
const TEST_TIME_ISO = "2026-04-02T21:00:00-06:00";
const TEST_TIME_UTC = new Date("2026-04-03T03:00:00Z");

beforeEach(() => {
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  cy.loginByApi(adminEmail, adminPassword);
  cy.visitWithAuth("/attendance");
  cy.url().should("include", "/attendance", { timeout: 10_000 });
  // Wait for page content to render before hiding the Dev Debugger — its check
  // is a synchronous DOM snapshot that silently no-ops if React hasn't hydrated yet.
  cy.get("[data-testid='stat-total']", { timeout: 10_000 }).should("exist");
  cy.closeDevDebugger();

  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);

  cy.get("[data-testid='stat-total']", { timeout: 10_000 }).click({ force: true });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCard(lastName: string, firstName: string) {
  return cy
    .contains("p", `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest("div.rounded-xl")
    .scrollIntoView();
}

function registerFullDay(lastName: string, firstName: string) {
  cy.intercept("GET", "**/attendances/today*").as("refetch");

  getCard(lastName, firstName).contains("button", "Registrar entrada").click({ force: true });
  cy.get("#checkin-time").clear({ force: true }).type("13:00", { force: true });
  cy.contains("button", "Confirmar entrada").should("not.be.disabled").click();
  cy.wait("@refetch", { timeout: 10_000 });

  getCard(lastName, firstName).contains("button", "Salir a comer").click({ force: true });
  cy.get("#lunch-time").clear({ force: true }).type("14:00", { force: true });
  cy.contains("button", "Confirmar salida").should("not.be.disabled").click();
  cy.wait("@refetch", { timeout: 10_000 });

  getCard(lastName, firstName).contains("button", "Regresar de comida").click({ force: true });
  cy.get("#lunch-return-time").clear({ force: true }).type("15:00", { force: true });
  cy.contains("button", "Confirmar regreso").should("not.be.disabled").click();
  cy.wait("@refetch", { timeout: 10_000 });

  getCard(lastName, firstName).contains("button", "Registrar salida").click({ force: true });
  cy.get("#checkout-time").clear({ force: true }).type("20:00", { force: true });
  cy.contains("button", "Confirmar salida").should("not.be.disabled").click();
  cy.wait("@refetch", { timeout: 10_000 });
}

// ══════════════════════════════════════════════════════════════════════════════
// Correcting check-in
// ══════════════════════════════════════════════════════════════════════════════

describe("Correcting an already-recorded check-in", () => {
  it("lets the admin correct Carlos's check-in time via the pencil next to Entrada", () => {
    registerFullDay("Mendoza", "Carlos");

    cy.intercept("GET", "**/attendances/today*").as("refetch");

    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("13:00").should("be.visible");
      cy.get('button[aria-label="Corregir entrada"]').click({ force: true });
    });

    cy.contains("Corregir hora de entrada").should("be.visible");
    cy.get("#checkin-time").should("have.value", "13:00");

    cy.get("#checkin-time").clear({ force: true }).type("13:15", { force: true });
    cy.contains("button", "Guardar corrección").should("not.be.disabled").click();
    cy.wait("@refetch", { timeout: 10_000 });

    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("13:15").should("be.visible");
      cy.contains("Tardanza entrada").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Correcting lunch-start
// ══════════════════════════════════════════════════════════════════════════════

describe("Correcting an already-recorded lunch-start", () => {
  it("lets the admin correct María's lunch-start time via the pencil next to Salida comida", () => {
    registerFullDay("García", "María");

    cy.intercept("GET", "**/attendances/today*").as("refetch");

    getCard("García", "María").within(() => {
      cy.get('button[aria-label="Corregir salida comida"]').click({ force: true });
    });

    cy.contains("Corregir hora de salida a comer").should("be.visible");
    cy.get("#lunch-time").should("have.value", "14:00");

    cy.get("#lunch-time").clear({ force: true }).type("14:10", { force: true });
    cy.contains("button", "Guardar corrección").should("not.be.disabled").click();
    cy.wait("@refetch", { timeout: 10_000 });

    getCard("García", "María").within(() => {
      cy.contains("14:10").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Correcting lunch-return
// ══════════════════════════════════════════════════════════════════════════════

describe("Correcting an already-recorded lunch-return", () => {
  it("lets the admin correct Pedro's lunch-return time via the pencil next to Regreso comida", () => {
    registerFullDay("López", "Pedro");

    cy.intercept("GET", "**/attendances/today*").as("refetch");

    getCard("López", "Pedro").within(() => {
      cy.get('button[aria-label="Corregir regreso comida"]').click({ force: true });
    });

    cy.contains("Corregir hora de regreso de comida").should("be.visible");
    cy.get("#lunch-return-time").should("have.value", "15:00");

    cy.get("#lunch-return-time").clear({ force: true }).type("15:20", { force: true });
    cy.contains("button", "Guardar corrección").should("not.be.disabled").click();
    cy.wait("@refetch", { timeout: 10_000 });

    getCard("López", "Pedro").within(() => {
      cy.contains("15:20").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Correcting check-out
// ══════════════════════════════════════════════════════════════════════════════

describe("Correcting an already-recorded check-out", () => {
  it("lets the admin correct Ana's check-out time via the pencil next to Salida", () => {
    registerFullDay("Ramírez", "Ana");

    cy.intercept("GET", "**/attendances/today*").as("refetch");

    getCard("Ramírez", "Ana").within(() => {
      cy.get('button[aria-label="Corregir salida"]').click({ force: true });
    });

    cy.contains("Corregir hora de salida").should("be.visible");
    cy.get("#checkout-time").should("have.value", "20:00");

    cy.get("#checkout-time").clear({ force: true }).type("20:30", { force: true });
    cy.contains("button", "Guardar corrección").should("not.be.disabled").click();
    cy.wait("@refetch", { timeout: 10_000 });

    getCard("Ramírez", "Ana").within(() => {
      cy.contains("20:30").should("be.visible");
    });
  });
});
