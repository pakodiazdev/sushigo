/**
 * Direct Permission Manager — E2E happy path tests
 *
 * Verifica dos flujos de la gestión de permisos directos en el panel de detalle
 * de empleado:
 *
 *   1. GRANT: admin otorga employees.view a una cocinera (María García, EMP-002)
 *      que no lo tiene por rol → verifica vía API que ahora puede listar empleados (200).
 *
 *   2. REVOKE: admin revoca ese permiso directo → verifica vía API que ya no puede
 *      listar empleados (403).
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE por archivo.
 *   AttendanceTestSeeder crea EMP-002 María García con rol 'cook' (sin employees.*).
 * • beforeEach() → login admin vía UI + navegar a /employees.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=direct-permission-manager
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin

const EMPLOYEE_NAME = 'María García'
const EMPLOYEE_EMAIL = 'maria.garcia@sushigo.com'
const EMPLOYEE_PASSWORD = 'employee123456'

const apiUrl = Cypress.env('apiUrl') ?? 'https://devtest.api.sushigo.local/api/v1'

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Login as the given user and attempt GET /api/v1/employees.
 * Returns the HTTP status code so tests can assert 200 vs 403.
 */
function getEmployeesStatus(email: string, password: string): Cypress.Chainable<number> {
  return cy
    .request({
      method: 'POST',
      url: `${apiUrl}/auth/login`,
      body: { email, password },
      failOnStatusCode: true,
    })
    .then((loginRes) => {
      const token = loginRes.body.data.token as string
      return cy.request({
        method: 'GET',
        url: `${apiUrl}/employees`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      })
    })
    .then((res) => res.status)
}

/**
 * Opens the PermissionManagerDialog for the currently visible employee detail panel.
 * Assumes the admin is already logged in and the panel is open.
 */
function openPermissionDialog(): void {
  cy.contains('button', 'Gestionar →', { timeout: 10_000 })
    .click({ force: true })
  // Dialog should appear — check title text inside dialog (avoid visibility check on fixed/portal elements)
  cy.contains('Permisos directos —', { timeout: 8_000 }).should('exist')
}

/**
 * In the open PermissionManagerDialog, toggle the checkbox for the given permission
 * slug (displayed as its own name in E2E env where labels are not seeded) and save.
 */
function togglePermissionAndSave(permissionName: string): void {
  // Scope all interactions to the dialog element to avoid z-index conflicts
  cy.get('dialog', { timeout: 8_000 }).within(() => {
    // The group is "Otros" in E2E env (permissions have no group in CoreTestSeeder)
    cy.contains('button', 'Otros').click({ force: true })

    // Find and click the label containing the permission name to toggle its checkbox
    cy.contains('label', permissionName, { timeout: 5_000 }).click({ force: true })

    // Guardar cambios
    cy.contains('button', 'Guardar cambios').click({ force: true })
  })

  // Dialog should close after save
  cy.contains('Permisos directos —').should('not.exist', { timeout: 10_000 })
}

// ── Suite setup ────────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 120_000 })
})

// ══════════════════════════════════════════════════════════════════════════════
// 1. Otorgar permiso directo → usuario puede hacer la acción
// ══════════════════════════════════════════════════════════════════════════════

describe('Gestión de permisos directos — Grant', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/employees')
    cy.url({ timeout: 10_000 }).should('include', '/employees')
    cy.closeDevDebugger()
  })

  it('antes del grant, la cocinera no puede listar empleados (403)', () => {
    getEmployeesStatus(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD).should('eq', 403)
  })

  it('admin otorga employees.view a la cocinera y ella ahora puede listar empleados (200)', () => {
    // ── 1. Abrir panel de detalle de la empleada ──────────────────────────────
    // Click the Eye (Ver detalle) button in María García's row
    cy.contains('tr', EMPLOYEE_NAME, { timeout: 10_000 })
      .find('button[title="Ver detalle"]')
      .click()
    cy.contains('Permisos directos del usuario', { timeout: 10_000 })
      .should('exist')

    // ── 2. Abrir el diálogo de permisos directos ──────────────────────────────
    openPermissionDialog()

    // ── 3. Otorgar employees.view ─────────────────────────────────────────────
    togglePermissionAndSave('employees.view')

    // ── 4. Verificar vía API que ahora puede listar empleados ─────────────────
    getEmployeesStatus(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD).should('eq', 200)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. Revocar permiso directo → usuario ya no puede hacer la acción
// ══════════════════════════════════════════════════════════════════════════════

describe('Gestión de permisos directos — Revoke', () => {
  beforeEach(() => {
    cy.loginByApi(adminEmail, adminPassword)
    cy.visitWithAuth('/employees')
    cy.url({ timeout: 10_000 }).should('include', '/employees')
    cy.closeDevDebugger()
  })

  it('admin revoca employees.view y la cocinera ya no puede listar empleados (403)', () => {
    // Prerequisite: employees.view was granted in the previous describe block.
    // The before() only runs once (DB reset at file start), so the grant persists.

    // ── 1. Abrir panel de detalle de la empleada ──────────────────────────────
    // Click the Eye (Ver detalle) button in María García's row
    cy.contains('tr', EMPLOYEE_NAME, { timeout: 10_000 })
      .find('button[title="Ver detalle"]')
      .click()
    cy.contains('Permisos directos del usuario', { timeout: 10_000 })
      .should('exist')

    // ── 2. Abrir el diálogo de permisos directos ──────────────────────────────
    openPermissionDialog()

    // ── 3. Revocar employees.view — ya aparece checked (direct source) ────────
    // After the grant test it shows as 'direct'; clicking it marks it for revoke
    cy.get('dialog', { timeout: 8_000 }).within(() => {
      cy.contains('button', 'Otros').click({ force: true })
      cy.contains('label', 'employees.view', { timeout: 5_000 }).click({ force: true })
      cy.contains('button', 'Guardar cambios').click({ force: true })
    })
    cy.contains('Permisos directos —').should('not.exist', { timeout: 10_000 })

    // ── 4. Verificar vía API que ya no puede listar empleados ─────────────────
    getEmployeesStatus(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD).should('eq', 403)
  })
})
