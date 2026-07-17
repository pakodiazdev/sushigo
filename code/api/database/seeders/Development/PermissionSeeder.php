<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\LockedSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends LockedSeeder
{
    private const EMPLOYEES_PATTERN = 'employees.%';

    private const ITEMS_PATTERN = 'items.%';

    private const INVENTORY_LOCATIONS_PATTERN = 'inventory_locations.%';

    private const STOCK_PATTERN = 'stock.%';

    private const EMPLOYEE_REQUESTS_PATTERN = 'employee-requests.%';

    private const LEAVES_PATTERN = 'leaves.%';

    private const VACATION_REQUESTS_PATTERN = 'vacation-requests.%';

    private const REPORTS_PATTERN = 'reports.%';

    private const PAYROLL_PATTERN = 'payroll.%';

    /**
     * Self-service Solicitudes access — every employee can view/create/cancel
     * their own requests, including self-service vacation requests (via the
     * generic employee-requests.create), but never approve or directly
     * schedule vacations on behalf of someone else (that stays admin-only —
     * see VACATION_REQUESTS_PATTERN above, granted only to admin).
     */
    private const SELF_SERVICE_REQUESTS_PERMISSIONS = [
        'employee-requests.view',
        'employee-requests.create',
        'employee-requests.cancel',
    ];

    private const GROUP_INVENTARIO = 'Inventario';

    private const GROUP_CUENTAS_BANCARIAS = 'Cuentas bancarias';

    private const GROUP_SESIONES_DE_CAJA = 'Sesiones de caja';

    private const GROUP_AJUSTES_DE_CAJA = 'Ajustes de caja';

    private const GROUP_GASTOS_DE_CAJA = 'Gastos de caja';

    private const GROUP_NOMINA = 'Nómina';

    public function run(): void
    {
        $permissions = [
            // Usuarios
            'users.index' => ['label' => 'Ver lista de usuarios',    'group' => 'Usuarios'],
            'users.show' => ['label' => 'Ver detalle de usuario',   'group' => 'Usuarios'],
            'users.store' => ['label' => 'Crear usuario',            'group' => 'Usuarios'],
            'users.update' => ['label' => 'Editar usuario',           'group' => 'Usuarios'],
            'users.destroy' => ['label' => 'Eliminar usuario',         'group' => 'Usuarios'],

            // Roles
            'roles.index' => ['label' => 'Ver lista de roles',       'group' => 'Roles'],
            'roles.show' => ['label' => 'Ver detalle de rol',        'group' => 'Roles'],
            'roles.store' => ['label' => 'Crear rol',                 'group' => 'Roles'],
            'roles.update' => ['label' => 'Editar rol',                'group' => 'Roles'],
            'roles.destroy' => ['label' => 'Eliminar rol',              'group' => 'Roles'],

            // Permisos
            'permissions.index' => ['label' => 'Ver lista de permisos', 'group' => 'Permisos'],
            'permissions.show' => ['label' => 'Ver detalle de permiso', 'group' => 'Permisos'],

            // Cajas
            'cash_registers.view' => ['label' => 'Ver cajas',           'group' => 'Cajas'],
            'cash_registers.create' => ['label' => 'Crear caja',          'group' => 'Cajas'],
            'cash_registers.update' => ['label' => 'Editar caja',         'group' => 'Cajas'],
            'cash_registers.delete' => ['label' => 'Eliminar caja',       'group' => 'Cajas'],

            // Terminales
            'cash_terminals.view' => ['label' => 'Ver terminales',      'group' => 'Terminales'],
            'cash_terminals.create' => ['label' => 'Crear terminal',      'group' => 'Terminales'],
            'cash_terminals.update' => ['label' => 'Editar terminal',     'group' => 'Terminales'],
            'cash_terminals.delete' => ['label' => 'Eliminar terminal',   'group' => 'Terminales'],

            // Cuentas bancarias
            'bank_accounts.view' => ['label' => 'Ver cuentas bancarias',    'group' => self::GROUP_CUENTAS_BANCARIAS],
            'bank_accounts.create' => ['label' => 'Crear cuenta bancaria',    'group' => self::GROUP_CUENTAS_BANCARIAS],
            'bank_accounts.update' => ['label' => 'Editar cuenta bancaria',   'group' => self::GROUP_CUENTAS_BANCARIAS],
            'bank_accounts.delete' => ['label' => 'Eliminar cuenta bancaria', 'group' => self::GROUP_CUENTAS_BANCARIAS],

            // Sesiones de caja
            'cash_sessions.view' => ['label' => 'Ver sesiones de caja',    'group' => self::GROUP_SESIONES_DE_CAJA],
            'cash_sessions.create' => ['label' => 'Abrir sesión de caja',    'group' => self::GROUP_SESIONES_DE_CAJA],
            'cash_sessions.update' => ['label' => 'Editar sesión de caja',   'group' => self::GROUP_SESIONES_DE_CAJA],
            'cash_sessions.post' => ['label' => 'Cerrar sesión de caja',   'group' => self::GROUP_SESIONES_DE_CAJA],

            // Ajustes de caja
            'cash_adjustments.view' => ['label' => 'Ver ajustes de caja',    'group' => self::GROUP_AJUSTES_DE_CAJA],
            'cash_adjustments.create' => ['label' => 'Crear ajuste de caja',   'group' => self::GROUP_AJUSTES_DE_CAJA],
            'cash_adjustments.update' => ['label' => 'Editar ajuste de caja',  'group' => self::GROUP_AJUSTES_DE_CAJA],
            'cash_adjustments.delete' => ['label' => 'Eliminar ajuste de caja', 'group' => self::GROUP_AJUSTES_DE_CAJA],
            'cash_adjustments.post' => ['label' => 'Publicar ajuste de caja', 'group' => self::GROUP_AJUSTES_DE_CAJA],

            // Gastos de caja
            'cash_expenses.view' => ['label' => 'Ver gastos de caja',    'group' => self::GROUP_GASTOS_DE_CAJA],
            'cash_expenses.create' => ['label' => 'Registrar gasto de caja',  'group' => self::GROUP_GASTOS_DE_CAJA],
            'cash_expenses.update' => ['label' => 'Editar gasto de caja',     'group' => self::GROUP_GASTOS_DE_CAJA],
            'cash_expenses.delete' => ['label' => 'Eliminar gasto de caja',   'group' => self::GROUP_GASTOS_DE_CAJA],
            'cash_expenses.post' => ['label' => 'Publicar gasto de caja',   'group' => self::GROUP_GASTOS_DE_CAJA],

            // Empleados
            'employees.view' => ['label' => 'Ver empleados',    'group' => 'Empleados'],
            'employees.create' => ['label' => 'Crear empleado',   'group' => 'Empleados'],
            'employees.update' => ['label' => 'Editar empleado',  'group' => 'Empleados'],

            // Ausencias — anticipated leave requests go through the generic
            // Employee Requests module (type=LEAVE), not through leaves.* directly.
            'leaves.register-direct' => ['label' => 'Registrar ausencia directa', 'group' => 'Ausencias'],

            // Vacaciones
            'vacation-requests.schedule' => ['label' => 'Programar vacaciones', 'group' => 'Ausencias'],
            'vacation-requests.approve' => ['label' => 'Aprobar vacaciones',   'group' => 'Ausencias'],
            'vacation-requests.reject' => ['label' => 'Rechazar vacaciones',  'group' => 'Ausencias'],

            // Solicitudes de empleado
            'employee-requests.view' => ['label' => 'Ver solicitudes',      'group' => 'Solicitudes'],
            'employee-requests.create' => ['label' => 'Crear solicitud',      'group' => 'Solicitudes'],
            'employee-requests.approve' => ['label' => 'Aprobar solicitud',    'group' => 'Solicitudes'],
            'employee-requests.cancel' => ['label' => 'Cancelar solicitud',   'group' => 'Solicitudes'],

            // Inventario — Ítems y variantes
            'items.view' => ['label' => 'Ver ítems y variantes',       'group' => self::GROUP_INVENTARIO],
            'items.create' => ['label' => 'Crear ítem / variante',      'group' => self::GROUP_INVENTARIO],
            'items.update' => ['label' => 'Editar ítem / variante',     'group' => self::GROUP_INVENTARIO],
            'items.delete' => ['label' => 'Eliminar ítem / variante',   'group' => self::GROUP_INVENTARIO],

            // Inventario — Ubicaciones
            'inventory_locations.view' => ['label' => 'Ver ubicaciones de inventario',    'group' => self::GROUP_INVENTARIO],
            'inventory_locations.manage' => ['label' => 'Gestionar ubicaciones de inventario', 'group' => self::GROUP_INVENTARIO],

            // Inventario — Stock y movimientos
            'stock.view' => ['label' => 'Ver stock y movimientos',   'group' => self::GROUP_INVENTARIO],
            'stock.manage' => ['label' => 'Registrar movimientos de stock', 'group' => self::GROUP_INVENTARIO],

            // Asistencia — configuración
            'punctuality.manage' => ['label' => 'Gestionar rangos de puntualidad', 'group' => 'Asistencia'],
            'holidays.manage' => ['label' => 'Gestionar días festivos', 'group' => 'Asistencia'],
            'overtime.manage' => ['label' => 'Gestionar tramos LFT de horas extra', 'group' => 'Asistencia'],

            // Configuración del sistema
            'settings.manage' => ['label' => 'Gestionar configuración del sistema', 'group' => 'Configuración'],

            // Reportes
            'reports.today' => ['label' => 'Ver reporte operacional del día', 'group' => 'Reportes'],
            'reports.weekly-summary' => ['label' => 'Ver resumen semanal por empleado', 'group' => 'Reportes'],

            // Nómina
            'payroll.preview' => ['label' => 'Ver preview de cierre de nómina', 'group' => self::GROUP_NOMINA],
            'payroll.close' => ['label' => 'Confirmar cierre de nómina', 'group' => self::GROUP_NOMINA],
            'payroll.reopen' => ['label' => 'Reabrir periodo de nómina cerrado', 'group' => self::GROUP_NOMINA],
            'payroll.reclose' => ['label' => 'Volver a cerrar un periodo de nómina reabierto', 'group' => self::GROUP_NOMINA],

            // Auditoría
            'audit-logs.view' => ['label' => 'Ver bitácora de auditoría', 'group' => 'Auditoría'],
        ];

        foreach ($permissions as $name => $meta) {
            Permission::updateOrCreate(
                ['name' => $name, 'guard_name' => 'api'],
                ['label' => $meta['label'], 'group' => $meta['group']]
            );
        }

        // super-admin: all permissions
        $superAdminRole = Role::where('name', 'super-admin')->where('guard_name', 'api')->first();
        if ($superAdminRole) {
            $superAdminRole->syncPermissions(Permission::where('guard_name', 'api')->get());
        }

        // admin: user + employee + leave + inventory management
        $adminRole = Role::where('name', 'admin')->where('guard_name', 'api')->first();
        if ($adminRole) {
            $adminRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', 'users.%')
                            ->orWhere('name', 'like', self::EMPLOYEES_PATTERN)
                            ->orWhere('name', 'like', self::LEAVES_PATTERN)
                            ->orWhere('name', 'like', self::VACATION_REQUESTS_PATTERN)
                            ->orWhere('name', 'like', self::EMPLOYEE_REQUESTS_PATTERN)
                            ->orWhere('name', 'like', self::ITEMS_PATTERN)
                            ->orWhere('name', 'like', self::INVENTORY_LOCATIONS_PATTERN)
                            ->orWhere('name', 'like', self::STOCK_PATTERN)
                            ->orWhere('name', 'like', self::REPORTS_PATTERN)
                            ->orWhere('name', 'like', self::PAYROLL_PATTERN)
                            ->orWhere('name', 'like', 'audit-logs.%')
                            ->orWhereIn('name', ['punctuality.manage', 'holidays.manage', 'settings.manage', 'overtime.manage']);
                    })
                    ->get()
            );
        }

        // inventory-manager: full inventory management (items, locations, stock)
        // Note: does NOT include employees.* or users.* — inventory is their only scope
        // (plus self-service Solicitudes — see SELF_SERVICE_REQUESTS below)
        $inventoryManagerRole = Role::where('name', 'inventory-manager')->where('guard_name', 'api')->first();
        if ($inventoryManagerRole) {
            $inventoryManagerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', self::ITEMS_PATTERN)
                            ->orWhere('name', 'like', self::INVENTORY_LOCATIONS_PATTERN)
                            ->orWhere('name', 'like', self::STOCK_PATTERN)
                            ->orWhereIn('name', self::SELF_SERVICE_REQUESTS_PERMISSIONS);
                    })
                    ->get()
            );
        }

        // manager (position role): jefe de piso — can view/manage employees.
        // Does NOT get VACATION_REQUESTS_PATTERN — directly scheduling vacations
        // on behalf of an employee is admin/super-admin-only; manager still
        // reviews self-service vacation requests via employee-requests.approve.
        // Payroll is scoped explicitly (not the PAYROLL_PATTERN wildcard) so that
        // reopen/reclose — admin-only per AP-047 — never leak in here by accident.
        $managerRole = Role::where('name', 'manager')->where('guard_name', 'api')->first();
        if ($managerRole) {
            $managerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->whereIn('name', ['users.show', 'users.index'])
                            ->orWhere('name', 'like', self::EMPLOYEES_PATTERN)
                            ->orWhere('name', 'like', self::LEAVES_PATTERN)
                            ->orWhere('name', 'like', self::EMPLOYEE_REQUESTS_PATTERN)
                            ->orWhere('name', 'like', self::REPORTS_PATTERN)
                            ->orWhereIn('name', ['payroll.preview', 'payroll.close']);
                    })
                    ->get()
            );
        }

        // cook, kitchen-assistant, delivery-driver, acting-manager: basic user access
        // plus self-service Solicitudes (view/create/cancel their own requests —
        // never approve, that stays manager/admin-only)
        foreach (['cook', 'kitchen-assistant', 'delivery-driver', 'acting-manager'] as $roleName) {
            $role = Role::where('name', $roleName)->where('guard_name', 'api')->first();
            if ($role) {
                $role->syncPermissions(
                    Permission::where('guard_name', 'api')
                        ->where(function ($q) {
                            $q->whereIn('name', ['users.show', 'users.index'])
                                ->orWhereIn('name', self::SELF_SERVICE_REQUESTS_PERMISSIONS);
                        })
                        ->get()
                );
            }
        }

        $this->command->info('✓ Development permissions seeded successfully');
    }
}
