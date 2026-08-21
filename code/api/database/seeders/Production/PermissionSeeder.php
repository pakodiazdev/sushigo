<?php

namespace Database\Seeders\Production;

use Database\Seeders\Base\LockedSeeder;
use Database\Seeders\Traits\AssignsBasicRolePermissions;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends LockedSeeder
{
    use AssignsBasicRolePermissions;

    private const MEDIA_WILDCARD = 'media.%';

    public function run(): void
    {
        $this->upsertPermissions($this->permissionDefinitions());
        $this->assignSuperAdminPermissions();
        $this->assignManagerPermissions();
        $this->assignAdminPermissions();
        $this->assignInventoryManagerPermissions();
        $this->assignBasicRolesPermissions();

        $this->command->info('✓ Production permissions seeded successfully');
    }

    /**
     * @return array<int, string>
     */
    private function permissionDefinitions(): array
    {
        return [
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

            // Leaves — anticipated requests go through Employee Requests (type=LEAVE)
            'leaves.register-direct',

            // Vacation Requests
            'vacation-requests.schedule',
            'vacation-requests.approve',
            'vacation-requests.reject',

            // Employee Requests
            'employee-requests.view',
            'employee-requests.create',
            'employee-requests.approve',
            'employee-requests.cancel',

            // Attendances
            'attendances.view',
            'attendances.create',
            'attendances.update',

            // Reportes
            'reports.today',
            'reports.weekly-summary',

            // Asistencia — configuración
            'punctuality.manage',
            'holidays.manage',
            'overtime.manage',
            'vacation-policy.manage',

            // Nómina
            'payroll.preview',
            'payroll.close',
            'payroll.reopen',
            'payroll.reclose',

            // Auditoría
            'audit-logs.view',

            // Inventario — Ítems y variantes
            'items.view',
            'items.create',
            'items.update',
            'items.delete',
            // Distinct from items.update on purpose — that also guards catalog/pricing
            // edits (PUT /items/{id}, PUT /item-variants/{id}). This only lets its
            // holder attach/reorder/delete an item's photos (Item::userCanManageMedia()).
            'items.manage-media',

            // Inventario — Marcas
            'brands.view',
            'brands.create',
            'brands.update',
            'brands.delete',

            // Inventario — Categorías de inventario
            'inventory_categories.view',
            'inventory_categories.create',
            'inventory_categories.update',
            'inventory_categories.delete',

            // Inventario — Plantillas de presentación de compra
            'purchase_presentation_templates.view',
            'purchase_presentation_templates.manage',

            // Inventario — Ubicaciones
            'inventory_locations.view',
            'inventory_locations.manage',

            // Inventario — Unidades de medida
            'units_of_measure.manage',

            // Inventario — Stock y movimientos
            'stock.view',
            'stock.manage',

            // Platillos (menú)
            'dishes.view',
            'dishes.create',
            'dishes.update',
            'dishes.delete',
            // Distinct from dishes.update on purpose — see Dish::userCanManageMedia().
            'dishes.manage-media',

            // Media
            'media.upload',
            'media.update',
            'media.delete',
        ];
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function upsertPermissions(array $permissions): void
    {
        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['name' => $permission, 'guard_name' => 'api'],
                ['name' => $permission, 'guard_name' => 'api']
            );
        }
    }

    private function assignSuperAdminPermissions(): void
    {
        // super-admin: all permissions
        $superAdminRole = Role::where('name', 'super-admin')->where('guard_name', 'api')->first();
        if ($superAdminRole) {
            $superAdminRole->syncPermissions(Permission::where('guard_name', 'api')->get());
        }
    }

    private function assignManagerPermissions(): void
    {
        // manager (position role): jefe de piso — can view/manage employees and attendances.
        // Does NOT get vacation-requests.% — directly scheduling vacations on behalf
        // of an employee is admin/super-admin-only; manager still reviews self-service
        // vacation requests via employee-requests.approve.
        // items.view + items.manage-media only — items.update also guards PUT
        // /items/{id} and PUT /item-variants/{id} (name, sale_price,
        // min_stock, ...), so granting it just to satisfy
        // Item::userCanManageMedia() (#377) would silently hand manager full
        // catalog/pricing edit rights too. items.manage-media is the
        // dedicated permission that check actually looks for. media.% is the
        // full wildcard on purpose — managing an item's photos
        // (upload/reorder/delete) is the actual point.
        $managerRole = Role::where('name', 'manager')->where('guard_name', 'api')->first();
        if ($managerRole) {
            $managerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->whereIn('name', ['users.show', 'users.index', 'items.view', 'items.manage-media', 'brands.view', 'inventory_categories.view', 'purchase_presentation_templates.view'])
                            ->orWhere('name', 'like', 'employees.%')
                            ->orWhere('name', 'like', 'leaves.%')
                            ->orWhere('name', 'like', 'employee-requests.%')
                            ->orWhere('name', 'like', 'attendances.%')
                            ->orWhere('name', 'like', 'reports.%')
                            ->orWhere('name', 'like', self::MEDIA_WILDCARD);
                    })
                    ->get()
            );
        }
    }

    private function assignAdminPermissions(): void
    {
        // admin (position role): full user + employee + leave + attendance + inventory management
        $adminRole = Role::where('name', 'admin')->where('guard_name', 'api')->first();
        if ($adminRole) {
            $adminRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', 'users.%')
                            ->orWhere('name', 'like', 'employees.%')
                            ->orWhere('name', 'like', 'leaves.%')
                            ->orWhere('name', 'like', 'vacation-requests.%')
                            ->orWhere('name', 'like', 'employee-requests.%')
                            ->orWhere('name', 'like', 'attendances.%')
                            ->orWhere('name', 'like', 'reports.%')
                            ->orWhere('name', 'like', 'items.%')
                            ->orWhere('name', 'like', 'brands.%')
                            ->orWhere('name', 'like', 'inventory_categories.%')
                            ->orWhere('name', 'like', 'purchase_presentation_templates.%')
                            ->orWhere('name', 'like', 'inventory_locations.%')
                            ->orWhere('name', 'like', 'stock.%')
                            ->orWhere('name', 'like', 'dishes.%')
                            ->orWhere('name', 'like', self::MEDIA_WILDCARD)
                            ->orWhere('name', 'like', 'audit-logs.%')
                            ->orWhereIn('name', ['units_of_measure.manage', 'punctuality.manage', 'holidays.manage', 'payroll.preview', 'payroll.close', 'payroll.reopen', 'payroll.reclose', 'overtime.manage', 'vacation-policy.manage']);
                    })
                    ->get()
            );
        }
    }

    private function assignInventoryManagerPermissions(): void
    {
        // inventory-manager: full inventory management (items, locations, stock)
        // Note: does NOT include employees.* or users.* — inventory is their only scope
        // (plus self-service Solicitudes)
        $inventoryManagerRole = Role::where('name', 'inventory-manager')->where('guard_name', 'api')->first();
        if ($inventoryManagerRole) {
            $inventoryManagerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', 'items.%')
                            ->orWhere('name', 'like', 'brands.%')
                            ->orWhere('name', 'like', 'inventory_categories.%')
                            ->orWhere('name', 'like', 'purchase_presentation_templates.%')
                            ->orWhere('name', 'like', 'inventory_locations.%')
                            ->orWhere('name', 'like', 'stock.%')
                            ->orWhere('name', 'like', self::MEDIA_WILDCARD)
                            ->orWhere('name', 'units_of_measure.manage')
                            ->orWhereIn('name', self::SELF_SERVICE_REQUESTS_PERMISSIONS);
                    })
                    ->get()
            );
        }
    }
}
