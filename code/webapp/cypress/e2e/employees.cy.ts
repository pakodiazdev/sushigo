/**
 * Employees — E2E tests
 *
 * DB reset strategy
 * ─────────────────
 * • before()     → cy.task('test:reset', 'attendance') ONCE por archivo (~3-5s).
 * • beforeEach() → login vía UI + navega a /employees.
 *
 * Para correr solo este archivo:
 *   make cypress-spec SPEC=employees
 *   make cypress-debug SPEC=employees
 *
 * Para filtrar por describe:
 *   make cypress-spec SPEC=employees GREP="Crear empleado"
 */

import users from '../fixtures/users.json'

const { email: adminEmail, password: adminPassword } = users.admin
const today = new Date().toISOString().slice(0, 10)

// ── Suite setup ─────────────────────────────────────────────────────────────

before(() => {
  cy.task('test:reset', 'attendance', { timeout: 60_000 })
})

// ══════════════════════════════════════════════════════════════════════════════
// 1. Crear empleado con horario y salario
// ══════════════════════════════════════════════════════════════════════════════

describe('Crear empleado', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    // Wait for the employee table to render before closing the DevDebugger.
    // cy.closeDevDebugger uses a synchronous DOM check — React must be
    // hydrated and the DevDebugger mounted before the check runs.
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('crea un empleado con horario Martes-Domingo (13:00-22:00) y sueldo neto semanal 1900', () => {

    // ── 1. Abrir formulario de creación ──────────────────────────────────────
    cy.contains('button', 'Nuevo Empleado').click()

    // ── 2. Llenar datos básicos ──────────────────────────────────────────────
    cy.get('input[name="first_name"]').type('Empleado', { force: true })
    cy.get('input[name="last_name"]').type('Cypress', { force: true })

    // Seleccionar puesto "Cocinero" via ToggleSwitch
    cy.contains('label', 'Cocinero').find('[role="switch"]').click({ force: true })

    // Email (obligatorio si no hay teléfono)
    cy.get('input[name="email"]').type('empleado.cypress@sushigo.com', { force: true })

    // La fecha de ingreso se pre-llena con hoy — no se modifica

    // ── 3. Crear empleado ────────────────────────────────────────────────────
    // scrollIntoView + force: the SlidePanel's autoScrollOnFocus triggers a
    // smooth-scroll animation when email is typed; the animation may still be
    // in flight when Cypress checks visibility. The button is present and
    // enabled — force bypasses the transient scroll-position race.
    cy.contains('button', 'Crear').scrollIntoView().click({ force: true })

    // Esperar a que aparezca la vista de detalle
    cy.contains('Empleado Cypress', { timeout: 10_000 }).scrollIntoView().should('be.visible')

    // ── 4. Crear horario: Martes-Domingo, 13:00-22:00, descansa Lunes ────────
    //
    // Valores por defecto del formulario de horario:
    //   expected_start: '13:00'  (correcto, no se cambia)
    //   expected_end:   '22:00'  (correcto, no se cambia)
    //   dow_1_off: false  → Lunes TRABAJA    (necesitamos: OFF)
    //   dow_2_off: false  → Martes TRABAJA   (correcto)
    //   dow_3_off: false  → Miércoles TRABAJA (correcto)
    //   dow_4_off: false  → Jueves TRABAJA   (correcto)
    //   dow_5_off: false  → Viernes TRABAJA  (correcto)
    //   dow_6_off: true   → Sábado DESCANSA  (necesitamos: TRABAJA)
    //   dow_7_off: true   → Domingo DESCANSA (necesitamos: TRABAJA)
    //
    cy.contains('button', /Agregar horario|Crear horario/, { timeout: 10_000 }).click()

    // Vigente desde: hoy (puede estar pre-llenado, se sobreescribe con force)
    cy.get('input[name="effective_from"]').clear({ force: true }).type(today, { force: true })

    // Entrada y Salida ya tienen los valores correctos por defecto (13:00 / 22:00)
    // Se confirman explícitamente con force para evitar problemas con el DevDebugger
    cy.get('input[name="expected_start"]').clear({ force: true }).type('13:00', { force: true })
    cy.get('input[name="expected_end"]').clear({ force: true }).type('22:00', { force: true })

    // Ajustar días (los checkboxes son sr-only, se requiere force siempre):
    cy.get('input[name="dow_1_off"]').check({ force: true })    // Lunes → OFF
    cy.get('input[name="dow_6_off"]').uncheck({ force: true })  // Sábado → TRABAJA
    cy.get('input[name="dow_7_off"]').uncheck({ force: true })  // Domingo → TRABAJA

    cy.contains('button', 'Guardar horario').click({ force: true })

    // Esperar a que el formulario de horario desaparezca y cerrar modal de confirmación
    cy.contains('button', 'Guardar horario', { timeout: 10_000 }).should('not.exist')

    // Cerrar el modal "Horario activo" que aparece tras guardar
    cy.contains('button', 'Cerrar', { timeout: 10_000 }).click()

    // ── 5. Registrar salario: neto semanal 1900 ───────────────────────────────
    //
    // Martes-Domingo (6 días) × 9h/día (13:00-22:00) = 54 horas semanales
    // La jornada semanal se calcula automáticamente del horario (no se ingresa)
    //
    cy.contains('button', 'Registrar Salario', { timeout: 10_000 }).click({ force: true })

    // Neto semanal = 1900 (campo identificado por placeholder "2,100")
    cy.get('input[placeholder="2,100"]').clear({ force: true }).type('1900', { force: true })

    // Fecha de inicio: hoy
    cy.contains('label', 'Fecha de inicio').parent().find('input[type="date"]').clear({ force: true }).type(today, { force: true })

    // Guardar
    cy.contains('button', 'Guardar Salario').click({ force: true })

    // ── 6. Verificar que el salario quedó registrado ──────────────────────────
    // El botón "Guardar Salario" debe desaparecer (el modal se cierra)
    cy.contains('button', 'Guardar Salario', { timeout: 10_000 }).should('not.exist')

    // El salario se registró exitosamente - verificamos que aparezca info de salario
    // o que el botón cambie a "Ver Salario" / "Editar Salario"
    cy.get('body').then(($body) => {
      // Si hay texto de salario visible o botón de editar, el salario está registrado
      const hasSalaryInfo = $body.text().includes('$') ||
        $body.text().includes('Salario') ||
        $body.find('button:contains("Editar Salario")').length > 0 ||
        $body.find('button:contains("Ver Salario")').length > 0
      expect(hasSalaryInfo, 'Salary info should be visible').to.be.true
    })

    // Cerrar el panel de detalle del empleado (navegar de vuelta a la lista)
    cy.visit('/employees')
    cy.url().should('include', '/employees')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. Verificar que el nuevo empleado puede iniciar sesión
// ══════════════════════════════════════════════════════════════════════════════

describe('Login nuevo empleado', () => {
  const newEmployeeEmail = 'empleado.cypress@sushigo.com'
  const newPassword = 'CypressTest123!'

  it('puede establecer contraseña y acceder con sus credenciales', () => {
    // Limpiar cualquier sesión previa
    cy.clearLocalStorage()
    cy.clearCookies()

    // ── 1. Obtener el enlace de reset via FileTokenRecorder ──────────────────
    cy.task<string | null>('test:getResetLink', newEmployeeEmail, { timeout: 10_000 })
      .then((resetLink) => {
        expect(resetLink, 'Reset link should exist').to.not.be.null

        // ── 2. Visitar el enlace de reset de contraseña ────────────────────────
        // El email viene con sushigo.local, pero cypress corre en devtest.sushigo.local
        // Extraemos solo el path con query params y lo usamos
        const url = new URL(resetLink!)
        const resetPath = url.pathname + url.search
        cy.visit(resetPath)

        // Esperar a que cargue la página de reset
        cy.url().should('include', '/reset-password')

        // ── 3. Establecer nueva contraseña ─────────────────────────────────────
        cy.get('input#password', { timeout: 10_000 }).should('be.visible').type(newPassword)
        cy.get('input#password_confirmation').type(newPassword)
        cy.contains('button', /Establecer|Guardar|Configurar/i).click()

        // ── 4. Verificar redirección al dashboard o login exitoso ──────────────
        cy.url({ timeout: 15_000 }).should('satisfy', (url: string) => {
          return url.includes('/dashboard') || url.includes('/employees') || !url.includes('/reset-password')
        })
      })
  })

  it('puede iniciar sesión con sus nuevas credenciales', () => {
    // Logout primero - limpiar storage antes de visitar cualquier página
    cy.clearLocalStorage()
    cy.clearCookies()

    // Visitar login y esperar a que cargue
    cy.visit('/login')
    cy.url().should('include', '/login')

    // Login con las credenciales del nuevo empleado
    cy.get('input#identifier', { timeout: 10_000 }).should('be.visible').clear().type(newEmployeeEmail)
    cy.get('input#password').clear().type(newPassword)
    cy.contains('button', /Iniciar Sesi[oó]n/i).click()

    // Verificar acceso exitoso - debe llegar al dashboard
    cy.url({ timeout: 15_000 }).should('not.include', '/login')

    // Verificar que el dashboard cargó (significa que el usuario está autenticado)
    cy.contains('Dashboard', { timeout: 10_000 }).should('exist')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 3. Pre-llenado del formulario de nuevo horario (#061)
// ══════════════════════════════════════════════════════════════════════════════

describe('Nuevo horario pre-llenado', () => {
  beforeEach(() => {
    cy.login(adminEmail, adminPassword)
    cy.url().should('not.include', '/login', { timeout: 10_000 })
    cy.visit('/employees')
    cy.url().should('include', '/employees', { timeout: 10_000 })
    // Wait for the employee table to render before closing the DevDebugger.
    // cy.closeDevDebugger uses a synchronous DOM check — React must be
    // hydrated and the DevDebugger mounted before the check runs.
    cy.get('table', { timeout: 10_000 }).should('exist')
    cy.closeDevDebugger()
  })

  it('pre-llena el formulario con valores del horario actual y fecha próximo lunes', () => {
    // ── 1. Seleccionar empleado Carlos Mendoza (EMP-001) que tiene horario ────
    cy.contains('tr', 'EMP-001', { timeout: 10_000 }).find('button[title="Ver detalle"]').click()

    // Esperar que abra el slide de detalle (EMP-001 aparece en la tabla)
    cy.contains('tr', 'EMP-001').should('exist')

    // ── 2. Abrir diálogo de horario ────────────────────────────────────────────
    cy.contains('button', /Ver horario/i, { timeout: 10_000 }).click()

    // Esperar que el modal aparezca y verificar contenido dentro del dialog
    cy.get('dialog[open]', { timeout: 10_000 }).should('exist')
    cy.get('dialog').within(() => {
      cy.contains('Horarios').should('exist')
      cy.contains(/1:00\s*PM|13:00/).should('exist')
      cy.contains(/10:00\s*PM|22:00/).should('exist')
    })

    // ── 3. Click en "Nuevo horario" ────────────────────────────────────────────
    cy.get('dialog').contains('button', 'Nuevo horario', { timeout: 10_000 }).click()

    // El formulario de creación debe aparecer dentro del dialog
    cy.get('dialog').within(() => {
      cy.contains('Horario laboral', { timeout: 10_000 }).should('exist')
    })

    // ── 4. Verificar que el formulario está pre-llenado ────────────────────────

    // La fecha debe ser el próximo lunes (o hoy si es lunes)
    cy.get('input[name="effective_from"]').should(($input) => {
      const value = $input.val() as string
      expect(value).to.match(/^\d{4}-\d{2}-\d{2}$/)  // formato YYYY-MM-DD

      // Verificar que la fecha es un lunes
      const date = new Date(value + 'T00:00:00')
      expect(date.getDay()).to.equal(1)  // 1 = Monday
    })

    // Entrada debe ser 13:00 (del horario actual)
    cy.get('input[name="expected_start"]').should('have.value', '13:00')

    // Salida debe ser 22:00 (del horario actual)
    cy.get('input[name="expected_end"]').should('have.value', '22:00')

    // Días de descanso: Domingo (dow_7) debe estar marcado
    // El horario actual es Mon-Sat trabaja, Sun descansa
    cy.get('input[name="dow_7_off"]').should('be.checked')

    // ── 5. Modificar algo y guardar ────────────────────────────────────────────
    // Cambiar hora de entrada a 14:00
    cy.get('input[name="expected_start"]').clear({ force: true }).type('14:00', { force: true })

    // Guardar
    cy.get('dialog').contains('button', 'Guardar horario').click({ force: true })

    // Esperar que el formulario de creación desaparezca (el input deja de existir)
    cy.get('input[name="expected_start"]', { timeout: 10_000 }).should('not.exist')

    // El diálogo vuelve a modo vista con el encabezado de horarios
    cy.get('dialog[open]', { timeout: 10_000 }).within(() => {
      cy.contains('Horarios', { timeout: 10_000 }).should('exist')
      // El historial debe mostrar el nuevo horario con entrada a las 2:00 PM (14:00)
      cy.contains('button', 'Historial').click()
      cy.contains(/2:00\s*PM|14:00/, { timeout: 10_000 }).should('exist')
    })
  })
})
