/**
 * Attendance Check-In — E2E tests
 *
 * Covers the retroactive time picker on the check-in confirmation dialog.
 * 8 scenarios: a tiempo, anticipado y tardanzas de 15m a 1h.
 *
 * Shift schedule (seeded for all employees):
 *   expected_start = 13:00 local (America/Mexico_City)
 *   expected_end   = 22:00 local
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE por archivo (~3-5s).
 * • beforeEach() → login vía UI + navega a /attendance/today.
 * • Cada it() usa un EMPLEADO DISTINTO — no se reutiliza ningún slot.
 *
 * Employees used (EMP-001..EMP-008 seeded via config/seeders.php):
 *   EMP-001  Mendoza, Carlos   → 13:00  (a tiempo,   0m tardanza)
 *   EMP-002  García, María     → 12:45  (anticipado, 0m tardanza)
 *   EMP-003  López, Pedro      → 13:15  (+15m)
 *   EMP-004  Ramírez, Ana      → 13:20  (+20m)
 *   EMP-005  Sánchez, Roberto  → 13:25  (+25m)
 *   EMP-006  Torres, Laura     → 13:30  (+30m)
 *   EMP-007  Flores, Miguel    → 13:31  (+31m)
 *   EMP-008  Vargas, Sofia     → 14:00  (+60m → "1h")
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=attendance-checkin
 *   make cypress-debug SPEC=attendance-checkin
 *
 * Para filtrar por describe:
 *   make cypress-spec SPEC=attendance-checkin GREP="a tiempo"
 */

import users from "../fixtures/users.json";

const { email: adminEmail, password: adminPassword } = users.admin;

// ── Suite setup ─────────────────────────────────────────────────────────────

before(() => {
  cy.task("test:reset", "attendance", { timeout: 60_000 });
});

// Test time configuration: server must believe it's 14:30 CDMX so we can submit check-ins from 12:45 to 14:00
const TEST_TIME_ISO = "2026-04-02T14:30:00-06:00"; // 14:30 CDMX = server perceives as "now"
const TEST_TIME_UTC = new Date("2026-04-02T20:30:00Z"); // Same moment in UTC for frontend Date mock

beforeEach(() => {
  // Intercept ALL API requests to add X-Test-Time header so server uses our mock time
  cy.intercept({ url: /\/api\/v1\// }, (req) => {
    req.headers["X-Test-Time"] = TEST_TIME_ISO;
    req.continue();
  }).as("apiWithTestTime");

  // Use API login to get auth storage
  cy.loginByApi(adminEmail, adminPassword);

  // Visit with auth - sets localStorage before page loads
  cy.visitWithAuth("/attendance/today");
  cy.url().should("include", "/attendance/today", { timeout: 10_000 });
  cy.closeDevDebugger();

  // Mock Date AFTER page loads to avoid interfering with auth initialization
  cy.clock(TEST_TIME_UTC.getTime(), ["Date"]);
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Opens the check-in dialog for the given employee card and submits with time.
 */
function openCheckInDialog(lastName: string, firstName: string, time: string) {
  // Intercept the refetch that TanStack Query will trigger after mutation
  cy.intercept("GET", "**/attendances/today*").as("refetchAttendance");

  cy.contains("p", `${lastName}, ${firstName}`)
    .closest("div.rounded-xl")
    .contains("button", "Registrar entrada")
    .scrollIntoView()
    .click({ force: true });

  cy.get("#checkin-time").clear({ force: true }).type(time, { force: true });

  cy.contains("button", "Confirmar entrada")
    .should("not.be.disabled")
    .click();

  // Wait for the refetch to complete so UI updates with new status
  cy.wait("@refetchAttendance", { timeout: 10_000 });
}

/**
 * Returns a Cypress chain scoped to the employee's card (after check-in).
 * scrollIntoView ensures the card is in the viewport before asserting visibility
 * (required when other employees' cards push this one below the fold).
 */
function getCard(lastName: string, firstName: string) {
  return cy
    .contains("p", `${lastName}, ${firstName}`, { timeout: 10_000 })
    .closest("div.rounded-xl")
    .scrollIntoView();
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. A tiempo — 13:00 (sin tardanza)
// ══════════════════════════════════════════════════════════════════════════════

describe("Check-in — A tiempo (13:00)", () => {
  it("registra la entrada de Carlos a las 13:00 sin tardanza", () => {
    openCheckInDialog("Mendoza", "Carlos", "13:00");

    getCard("Mendoza", "Carlos").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
      cy.contains("Entrada").should("be.visible");
      cy.contains("Tardanza entrada").should("not.exist");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Anticipado — 12:45 (sin tardanza)
// ══════════════════════════════════════════════════════════════════════════════

describe("Check-in — Anticipado (12:45)", () => {
  it("registra la entrada de María a las 12:45 sin tardanza", () => {
    openCheckInDialog("García", "María", "12:45");

    getCard("García", "María").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
      cy.contains("Entrada").should("be.visible");
      cy.contains("Tardanza entrada").should("not.exist");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Tardanza 15m — 13:15
// ══════════════════════════════════════════════════════════════════════════════

describe("Check-in — Tardanza 15m (13:15)", () => {
  it("registra la entrada de Pedro a las 13:15 con 15m de tardanza", () => {
    openCheckInDialog("López", "Pedro", "13:15");

    getCard("López", "Pedro").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
      cy.contains("Tardanza entrada").should("be.visible");
      cy.contains("15m").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. Tardanza 20m — 13:20
// ══════════════════════════════════════════════════════════════════════════════

describe("Check-in — Tardanza 20m (13:20)", () => {
  it("registra la entrada de Ana a las 13:20 con 20m de tardanza", () => {
    openCheckInDialog("Ramírez", "Ana", "13:20");

    getCard("Ramírez", "Ana").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
      cy.contains("Tardanza entrada").should("be.visible");
      cy.contains("20m").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. Tardanza 25m — 13:25
// ══════════════════════════════════════════════════════════════════════════════

describe("Check-in — Tardanza 25m (13:25)", () => {
  it("registra la entrada de Roberto a las 13:25 con 25m de tardanza", () => {
    openCheckInDialog("Sánchez", "Roberto", "13:25");

    getCard("Sánchez", "Roberto").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
      cy.contains("Tardanza entrada").should("be.visible");
      cy.contains("25m").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. Tardanza 30m — 13:30
// ══════════════════════════════════════════════════════════════════════════════

describe("Check-in — Tardanza 30m (13:30)", () => {
  it("registra la entrada de Laura a las 13:30 con 30m de tardanza", () => {
    openCheckInDialog("Torres", "Laura", "13:30");

    getCard("Torres", "Laura").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
      cy.contains("Tardanza entrada").should("be.visible");
      cy.contains("30m").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. Tardanza 31m — 13:31
// ══════════════════════════════════════════════════════════════════════════════

describe("Check-in — Tardanza 31m (13:31)", () => {
  it("registra la entrada de Miguel a las 13:31 con 31m de tardanza", () => {
    openCheckInDialog("Flores", "Miguel", "13:31");

    getCard("Flores", "Miguel").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
      cy.contains("Tardanza entrada").should("be.visible");
      cy.contains("31m").should("be.visible");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. Tardanza 1h — 14:00
//    60 min → formatSeconds(3600) → "1h"
// ══════════════════════════════════════════════════════════════════════════════

describe("Check-in — Tardanza 1h (14:00)", () => {
  it("registra la entrada de Sofia a las 14:00 con 1h de tardanza", () => {
    openCheckInDialog("Vargas", "Sofia", "14:00");

    getCard("Vargas", "Sofia").within(() => {
      cy.contains("En trabajo", { timeout: 10_000 }).should("be.visible");
      cy.contains("Tardanza entrada").should("be.visible");
      cy.contains("1h").should("be.visible");
    });
  });
});
