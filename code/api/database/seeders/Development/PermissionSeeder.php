<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\LockedSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends LockedSeeder
{
    private const EMPLOYEES_PATTERN = 'employees.%';

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
            'bank_accounts.view' => ['label' => 'Ver cuentas bancarias',    'group' => 'Cuentas bancarias'],
            'bank_accounts.create' => ['label' => 'Crear cuenta bancaria',    'group' => 'Cuentas bancarias'],
            'bank_accounts.update' => ['label' => 'Editar cuenta bancaria',   'group' => 'Cuentas bancarias'],
            'bank_accounts.delete' => ['label' => 'Eliminar cuenta bancaria', 'group' => 'Cuentas bancarias'],

            // Sesiones de caja
            'cash_sessions.view' => ['label' => 'Ver sesiones de caja',    'group' => 'Sesiones de caja'],
            'cash_sessions.create' => ['label' => 'Abrir sesión de caja',    'group' => 'Sesiones de caja'],
            'cash_sessions.update' => ['label' => 'Editar sesión de caja',   'group' => 'Sesiones de caja'],
            'cash_sessions.post' => ['label' => 'Cerrar sesión de caja',   'group' => 'Sesiones de caja'],

            // Ajustes de caja
            'cash_adjustments.view' => ['label' => 'Ver ajustes de caja',    'group' => 'Ajustes de caja'],
            'cash_adjustments.create' => ['label' => 'Crear ajuste de caja',   'group' => 'Ajustes de caja'],
            'cash_adjustments.update' => ['label' => 'Editar ajuste de caja',  'group' => 'Ajustes de caja'],
            'cash_adjustments.delete' => ['label' => 'Eliminar ajuste de caja', 'group' => 'Ajustes de caja'],
            'cash_adjustments.post' => ['label' => 'Publicar ajuste de caja', 'group' => 'Ajustes de caja'],

            // Gastos de caja
            'cash_expenses.view' => ['label' => 'Ver gastos de caja',    'group' => 'Gastos de caja'],
            'cash_expenses.create' => ['label' => 'Registrar gasto de caja',  'group' => 'Gastos de caja'],
            'cash_expenses.update' => ['label' => 'Editar gasto de caja',     'group' => 'Gastos de caja'],
            'cash_expenses.delete' => ['label' => 'Eliminar gasto de caja',   'group' => 'Gastos de caja'],
            'cash_expenses.post' => ['label' => 'Publicar gasto de caja',   'group' => 'Gastos de caja'],

            // Empleados
            'employees.view' => ['label' => 'Ver empleados',    'group' => 'Empleados'],
            'employees.create' => ['label' => 'Crear empleado',   'group' => 'Empleados'],
            'employees.update' => ['label' => 'Editar empleado',  'group' => 'Empleados'],

            // Ausencias
            'leaves.register-direct' => ['label' => 'Registrar ausencia directa', 'group' => 'Ausencias'],
            'leaves.request' => ['label' => 'Solicitar ausencia',          'group' => 'Ausencias'],
            'leaves.approve' => ['label' => 'Aprobar ausencia',            'group' => 'Ausencias'],
            'leaves.reject' => ['label' => 'Rechazar ausencia',           'group' => 'Ausencias'],
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

        // admin: user + employee + leave management
        $adminRole = Role::where('name', 'admin')->where('guard_name', 'api')->first();
        if ($adminRole) {
            $adminRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', 'users.%')
                            ->orWhere('name', 'like', self::EMPLOYEES_PATTERN)
                            ->orWhere('name', 'like', 'leaves.%');
                    })
                    ->get()
            );
        }

        // inventory-manager: inventory + employee management
        $inventoryManagerRole = Role::where('name', 'inventory-manager')->where('guard_name', 'api')->first();
        if ($inventoryManagerRole) {
            $inventoryManagerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', self::EMPLOYEES_PATTERN)
                            ->orWhere('name', 'like', 'users.%');
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
                            ->orWhere('name', 'like', 'leaves.%');
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
