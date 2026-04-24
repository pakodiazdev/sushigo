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

    private const GROUP_INVENTARIO = 'Inventario';

    private const GROUP_CUENTAS_BANCARIAS = 'Cuentas bancarias';

    private const GROUP_SESIONES_DE_CAJA = 'Sesiones de caja';

    private const GROUP_AJUSTES_DE_CAJA = 'Ajustes de caja';

    private const GROUP_GASTOS_DE_CAJA = 'Gastos de caja';

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

            // Ausencias
            'leaves.register-direct' => ['label' => 'Registrar ausencia directa', 'group' => 'Ausencias'],
            'leaves.request' => ['label' => 'Solicitar ausencia',          'group' => 'Ausencias'],
            'leaves.approve' => ['label' => 'Aprobar ausencia',            'group' => 'Ausencias'],
            'leaves.reject' => ['label' => 'Rechazar ausencia',           'group' => 'Ausencias'],

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
                            ->orWhere('name', 'like', 'leaves.%')
                            ->orWhere('name', 'like', 'employee-requests.%')
                            ->orWhere('name', 'like', self::ITEMS_PATTERN)
                            ->orWhere('name', 'like', self::INVENTORY_LOCATIONS_PATTERN)
                            ->orWhere('name', 'like', self::STOCK_PATTERN);
                    })
                    ->get()
            );
        }

        // inventory-manager: full inventory management (items, locations, stock)
        // Note: does NOT include employees.* or users.* — inventory is their only scope
        $inventoryManagerRole = Role::where('name', 'inventory-manager')->where('guard_name', 'api')->first();
        if ($inventoryManagerRole) {
            $inventoryManagerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', self::ITEMS_PATTERN)
                            ->orWhere('name', 'like', self::INVENTORY_LOCATIONS_PATTERN)
                            ->orWhere('name', 'like', self::STOCK_PATTERN);
                    })
                    ->get()
            );
        }

        // manager (position role): jefe de piso — can view/manage employees
        $managerRole = Role::where('name', 'manager')->where('guard_name', 'api')->first();
        if ($managerRole) {
            $managerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->whereIn('name', ['users.show', 'users.index'])
                            ->orWhere('name', 'like', self::EMPLOYEES_PATTERN)
                            ->orWhere('name', 'like', 'leaves.%')
                            ->orWhere('name', 'like', 'employee-requests.%');
                    })
                    ->get()
            );
        }

        // cook, kitchen-assistant, delivery-driver, acting-manager: basic user access
        foreach (['cook', 'kitchen-assistant', 'delivery-driver', 'acting-manager'] as $roleName) {
            $role = Role::where('name', $roleName)->where('guard_name', 'api')->first();
            if ($role) {
                $role->syncPermissions(
                    Permission::where('guard_name', 'api')
                        ->whereIn('name', ['users.show', 'users.index'])
                        ->get()
                );
            }
        }

        $this->command->info('✓ Development permissions seeded successfully');
    }
}
