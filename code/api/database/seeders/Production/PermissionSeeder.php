<?php

namespace Database\Seeders\Production;

use Database\Seeders\Base\LockedSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends LockedSeeder
{
    public function run(): void
    {
        $permissions = [
            'users.index',
            'users.show',
            'users.store',
            'users.update',
            'users.destroy',
            'roles.index',
            'roles.show',
            'roles.store',
            'roles.update',
            'roles.destroy',
            'permissions.index',
            'permissions.show',

            // Cash Registers
            'cash_registers.view',
            'cash_registers.create',
            'cash_registers.update',
            'cash_registers.delete',

            // Cash Terminals
            'cash_terminals.view',
            'cash_terminals.create',
            'cash_terminals.update',
            'cash_terminals.delete',

            // Bank Accounts
            'bank_accounts.view',
            'bank_accounts.create',
            'bank_accounts.update',
            'bank_accounts.delete',

            // Cash Sessions
            'cash_sessions.view',
            'cash_sessions.create',
            'cash_sessions.update',
            'cash_sessions.post',

            // Cash Adjustments
            'cash_adjustments.view',
            'cash_adjustments.create',
            'cash_adjustments.update',
            'cash_adjustments.delete',
            'cash_adjustments.post',

            // Cash Expenses
            'cash_expenses.view',
            'cash_expenses.create',
            'cash_expenses.update',
            'cash_expenses.delete',
            'cash_expenses.post',

            // Employees
            'employees.view',
            'employees.create',
            'employees.update',

            // Leaves
            'leaves.register-direct',
            'leaves.request',
            'leaves.approve',
            'leaves.reject',

            // Employee Requests
            'employee-requests.view',
            'employee-requests.create',
            'employee-requests.approve',

            // Attendances
            'attendances.view',
            'attendances.create',

            // Inventario — Ítems y variantes
            'items.view',
            'items.create',
            'items.update',
            'items.delete',

            // Inventario — Ubicaciones
            'inventory_locations.view',
            'inventory_locations.manage',

            // Inventario — Stock y movimientos
            'stock.view',
            'stock.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['name' => $permission, 'guard_name' => 'api'],
                ['name' => $permission, 'guard_name' => 'api']
            );
        }

        // super-admin: all permissions
        $superAdminRole = Role::where('name', 'super-admin')->where('guard_name', 'api')->first();
        if ($superAdminRole) {
            $superAdminRole->syncPermissions(Permission::where('guard_name', 'api')->get());
        }

        // manager (position role): jefe de piso — can view/manage employees and attendances
        $managerRole = Role::where('name', 'manager')->where('guard_name', 'api')->first();
        if ($managerRole) {
            $managerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->whereIn('name', ['users.show', 'users.index'])
                            ->orWhere('name', 'like', 'employees.%')
                            ->orWhere('name', 'like', 'leaves.%')
                            ->orWhere('name', 'like', 'employee-requests.%')
                            ->orWhere('name', 'like', 'attendances.%');
                    })
                    ->get()
            );
        }

        // admin (position role): full user + employee + leave + attendance + inventory management
        $adminRole = Role::where('name', 'admin')->where('guard_name', 'api')->first();
        if ($adminRole) {
            $adminRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', 'users.%')
                            ->orWhere('name', 'like', 'employees.%')
                            ->orWhere('name', 'like', 'leaves.%')
                            ->orWhere('name', 'like', 'employee-requests.%')
                            ->orWhere('name', 'like', 'attendances.%')
                            ->orWhere('name', 'like', 'items.%')
                            ->orWhere('name', 'like', 'inventory_locations.%')
                            ->orWhere('name', 'like', 'stock.%');
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
                        $q->where('name', 'like', 'items.%')
                            ->orWhere('name', 'like', 'inventory_locations.%')
                            ->orWhere('name', 'like', 'stock.%');
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

        $this->command->info('✓ Production permissions seeded successfully');
    }
}
