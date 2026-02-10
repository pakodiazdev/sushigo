<?php

namespace Database\Seeders\Development;

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
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['name' => $permission, 'guard_name' => 'api'],
                ['name' => $permission, 'guard_name' => 'api']
            );
        }

        $superAdminRole = Role::where('name', 'super-admin')
            ->where('guard_name', 'api')
            ->first();

        if ($superAdminRole) {
            $superAdminRole->syncPermissions(Permission::where('guard_name', 'api')->get());
        }

        $adminRole = Role::where('name', 'admin')
            ->where('guard_name', 'api')
            ->first();

        if ($adminRole) {
            $adminRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', 'users.%')
                            ->orWhere('name', 'like', 'employees.%');
                    })
                    ->get()
            );
        }

        $managerRole = Role::where('name', 'manager')
            ->where('guard_name', 'api')
            ->first();

        if ($managerRole) {
            $managerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where('name', 'like', 'employees.%')
                    ->get()
            );
        }

        $userRole = Role::where('name', 'user')
            ->where('guard_name', 'api')
            ->first();

        if ($userRole) {
            $userRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->whereIn('name', ['users.show', 'users.index'])
                    ->get()
            );
        }

        $this->command->info('✓ Development permissions seeded successfully');
    }
}
