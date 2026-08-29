<?php

namespace Database\Seeders\Development;

use Database\Seeders\Base\LockedSeeder;
use Database\Seeders\Traits\AssignsBasicRolePermissions;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends LockedSeeder
{
    use AssignsBasicRolePermissions;

    private const EMPLOYEES_PATTERN = 'employees.%';

    private const ITEMS_PATTERN = 'items.%';

    private const BRANDS_PATTERN = 'brands.%';

    private const INVENTORY_CATEGORIES_PATTERN = 'inventory_categories.%';

    private const PURCHASE_PRESENTATION_TEMPLATES_PATTERN = 'purchase_presentation_templates.%';

    private const SUPPLIERS_PATTERN = 'suppliers.%';

    private const RECEIPTS_PATTERN = 'receipts.%';

    private const INVENTORY_LOCATIONS_PATTERN = 'inventory_locations.%';

    private const STOCK_PATTERN = 'stock.%';

    private const DISHES_PATTERN = 'dishes.%';

    private const MEDIA_PATTERN = 'media.%';

    private const EMPLOYEE_REQUESTS_PATTERN = 'employee-requests.%';

    private const LEAVES_PATTERN = 'leaves.%';

    private const VACATION_REQUESTS_PATTERN = 'vacation-requests.%';

    private const REPORTS_PATTERN = 'reports.%';

    private const PAYROLL_PATTERN = 'payroll.%';

    private const ATTENDANCES_PATTERN = 'attendances.%';

    // Matches both price_lists.% and price_list_assignments.% (#435) —
    // VariantPrice CRUD reuses price_lists.* rather than a permission of its
    // own, see PriceListPolicy/PriceListAssignmentPolicy.
    private const PRICING_PATTERN = 'price_list%';

    private const GROUP_INVENTARIO = 'Inventario';

    private const GROUP_PLATILLOS = 'Platillos';

    private const GROUP_PRECIOS = 'Precios';

    private const GROUP_CUENTAS_BANCARIAS = 'Cuentas bancarias';

    private const GROUP_SESIONES_DE_CAJA = 'Sesiones de caja';

    private const GROUP_AJUSTES_DE_CAJA = 'Ajustes de caja';

    private const GROUP_GASTOS_DE_CAJA = 'Gastos de caja';

    private const GROUP_NOMINA = 'Nómina';

    public function run(): void
    {
        $this->upsertPermissions($this->permissionDefinitions());

        $this->assignSuperAdminPermissions();
        $this->assignAdminPermissions();
        $this->assignInventoryManagerPermissions();
        $this->assignManagerPermissions();
        $this->assignBasicRolesPermissions();

        $this->command->info('✓ Development permissions seeded successfully');
    }

    /**
     * @return array<string, array{label: string, group: string}>
     */
    private function permissionDefinitions(): array
    {
        return [
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
            // Distinct from items.update on purpose — that also guards catalog/pricing
            // edits (PUT /items/{id}, PUT /item-variants/{id}). This only lets its
            // holder attach/reorder/delete an item's photos (Item::userCanManageMedia()).
            'items.manage-media' => ['label' => 'Gestionar fotos del ítem', 'group' => self::GROUP_INVENTARIO],

            // Inventario — Marcas
            'brands.view' => ['label' => 'Ver marcas', 'group' => self::GROUP_INVENTARIO],
            'brands.create' => ['label' => 'Crear marca', 'group' => self::GROUP_INVENTARIO],
            'brands.update' => ['label' => 'Editar marca', 'group' => self::GROUP_INVENTARIO],
            'brands.delete' => ['label' => 'Eliminar marca', 'group' => self::GROUP_INVENTARIO],

            // Inventario — Categorías de inventario
            'inventory_categories.view' => ['label' => 'Ver categorías de inventario', 'group' => self::GROUP_INVENTARIO],
            'inventory_categories.create' => ['label' => 'Crear categoría de inventario', 'group' => self::GROUP_INVENTARIO],
            'inventory_categories.update' => ['label' => 'Editar categoría de inventario', 'group' => self::GROUP_INVENTARIO],
            'inventory_categories.delete' => ['label' => 'Eliminar categoría de inventario', 'group' => self::GROUP_INVENTARIO],

            // Inventario — Plantillas de presentación de compra
            'purchase_presentation_templates.view' => ['label' => 'Ver plantillas de presentación de compra', 'group' => self::GROUP_INVENTARIO],
            'purchase_presentation_templates.manage' => ['label' => 'Gestionar plantillas de presentación de compra', 'group' => self::GROUP_INVENTARIO],

            // Inventario — Proveedores y ofertas de compra
            'suppliers.view' => ['label' => 'Ver proveedores y ofertas', 'group' => self::GROUP_INVENTARIO],
            'suppliers.manage' => ['label' => 'Gestionar proveedores y ofertas', 'group' => self::GROUP_INVENTARIO],

            // Inventario — Recepciones de compra (#432)
            'receipts.view' => ['label' => 'Ver recepciones de compra', 'group' => self::GROUP_INVENTARIO],
            'receipts.manage' => ['label' => 'Gestionar recepciones de compra', 'group' => self::GROUP_INVENTARIO],

            // Inventario — Ubicaciones
            'inventory_locations.view' => ['label' => 'Ver ubicaciones de inventario',    'group' => self::GROUP_INVENTARIO],
            'inventory_locations.manage' => ['label' => 'Gestionar ubicaciones de inventario', 'group' => self::GROUP_INVENTARIO],

            // Inventario — Unidades de medida
            'units_of_measure.manage' => ['label' => 'Gestionar unidades de medida', 'group' => self::GROUP_INVENTARIO],

            // Inventario — Stock y movimientos
            'stock.view' => ['label' => 'Ver stock y movimientos',   'group' => self::GROUP_INVENTARIO],
            'stock.manage' => ['label' => 'Registrar movimientos de stock', 'group' => self::GROUP_INVENTARIO],

            // Platillos (menú)
            'dishes.view' => ['label' => 'Ver platillos y categorías', 'group' => self::GROUP_PLATILLOS],
            'dishes.create' => ['label' => 'Crear platillo / categoría', 'group' => self::GROUP_PLATILLOS],
            'dishes.update' => ['label' => 'Editar platillo / categoría', 'group' => self::GROUP_PLATILLOS],
            'dishes.delete' => ['label' => 'Eliminar platillo / categoría', 'group' => self::GROUP_PLATILLOS],
            // Distinct from dishes.update on purpose — same reasoning as items.manage-media:
            // dishes.update also guards catalog/pricing edits (PUT /dishes/{id}), so reusing
            // it here would let anyone granted "manage this dish's photo" also silently edit
            // its name/price/category. See Dish::userCanManageMedia().
            'dishes.manage-media' => ['label' => 'Gestionar fotos del platillo', 'group' => self::GROUP_PLATILLOS],

            // Precios (Price Lists — #435). VariantPrice CRUD is a sub-resource of a
            // Price List and reuses price_lists.view/.update, it has no permission of
            // its own — see PriceListPolicy/PriceListAssignmentPolicy.
            'price_lists.view' => ['label' => 'Ver listas de precios', 'group' => self::GROUP_PRECIOS],
            'price_lists.create' => ['label' => 'Crear lista de precios', 'group' => self::GROUP_PRECIOS],
            'price_lists.update' => ['label' => 'Editar lista de precios / precios de variante', 'group' => self::GROUP_PRECIOS],
            'price_lists.delete' => ['label' => 'Eliminar lista de precios', 'group' => self::GROUP_PRECIOS],
            'price_list_assignments.view' => ['label' => 'Ver asignaciones de lista de precios', 'group' => self::GROUP_PRECIOS],
            'price_list_assignments.create' => ['label' => 'Asignar lista de precios a un contexto', 'group' => self::GROUP_PRECIOS],
            'price_list_assignments.update' => ['label' => 'Editar asignación de lista de precios', 'group' => self::GROUP_PRECIOS],
            'price_list_assignments.delete' => ['label' => 'Eliminar asignación de lista de precios', 'group' => self::GROUP_PRECIOS],

            // Media
            'media.upload' => ['label' => 'Subir archivos multimedia', 'group' => 'Media'],
            'media.update' => ['label' => 'Reordenar / marcar imagen principal', 'group' => 'Media'],
            'media.delete' => ['label' => 'Eliminar archivos multimedia', 'group' => 'Media'],

            // Asistencia — registro
            'attendances.view' => ['label' => 'Ver asistencias', 'group' => 'Asistencia'],
            'attendances.create' => ['label' => 'Registrar asistencia', 'group' => 'Asistencia'],
            'attendances.update' => ['label' => 'Corregir asistencia registrada', 'group' => 'Asistencia'],

            // Asistencia — configuración
            'punctuality.manage' => ['label' => 'Gestionar rangos de puntualidad', 'group' => 'Asistencia'],
            'holidays.manage' => ['label' => 'Gestionar días festivos', 'group' => 'Asistencia'],
            'overtime.manage' => ['label' => 'Gestionar tramos LFT de horas extra', 'group' => 'Asistencia'],
            'vacation-policy.manage' => ['label' => 'Gestionar reglas de vacaciones', 'group' => 'Asistencia'],

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
    }

    /**
     * @param  array<string, array{label: string, group: string}>  $permissions
     */
    private function upsertPermissions(array $permissions): void
    {
        foreach ($permissions as $name => $meta) {
            Permission::updateOrCreate(
                ['name' => $name, 'guard_name' => 'api'],
                ['label' => $meta['label'], 'group' => $meta['group']]
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

    private function assignAdminPermissions(): void
    {
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
                            ->orWhere('name', 'like', self::BRANDS_PATTERN)
                            ->orWhere('name', 'like', self::INVENTORY_CATEGORIES_PATTERN)
                            ->orWhere('name', 'like', self::PURCHASE_PRESENTATION_TEMPLATES_PATTERN)
                            ->orWhere('name', 'like', self::SUPPLIERS_PATTERN)
                            ->orWhere('name', 'like', self::RECEIPTS_PATTERN)
                            ->orWhere('name', 'like', self::INVENTORY_LOCATIONS_PATTERN)
                            ->orWhere('name', 'like', self::STOCK_PATTERN)
                            ->orWhere('name', 'like', self::DISHES_PATTERN)
                            ->orWhere('name', 'like', self::PRICING_PATTERN)
                            ->orWhere('name', 'like', self::MEDIA_PATTERN)
                            ->orWhere('name', 'like', self::REPORTS_PATTERN)
                            ->orWhere('name', 'like', self::PAYROLL_PATTERN)
                            ->orWhere('name', 'like', self::ATTENDANCES_PATTERN)
                            ->orWhere('name', 'like', 'audit-logs.%')
                            ->orWhereIn('name', ['units_of_measure.manage', 'punctuality.manage', 'holidays.manage', 'settings.manage', 'overtime.manage', 'vacation-policy.manage']);
                    })
                    ->get()
            );
        }
    }

    private function assignInventoryManagerPermissions(): void
    {
        // inventory-manager: full inventory management (items, locations, stock)
        // Note: does NOT include employees.* or users.* — inventory is their only scope
        // (plus self-service Solicitudes — see SELF_SERVICE_REQUESTS below)
        $inventoryManagerRole = Role::where('name', 'inventory-manager')->where('guard_name', 'api')->first();
        if ($inventoryManagerRole) {
            $inventoryManagerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->where('name', 'like', self::ITEMS_PATTERN)
                            ->orWhere('name', 'like', self::BRANDS_PATTERN)
                            ->orWhere('name', 'like', self::INVENTORY_CATEGORIES_PATTERN)
                            ->orWhere('name', 'like', self::PURCHASE_PRESENTATION_TEMPLATES_PATTERN)
                            ->orWhere('name', 'like', self::SUPPLIERS_PATTERN)
                            ->orWhere('name', 'like', self::RECEIPTS_PATTERN)
                            ->orWhere('name', 'like', self::INVENTORY_LOCATIONS_PATTERN)
                            ->orWhere('name', 'like', self::STOCK_PATTERN)
                            ->orWhere('name', 'like', self::PRICING_PATTERN)
                            ->orWhere('name', 'like', self::MEDIA_PATTERN)
                            ->orWhere('name', 'units_of_measure.manage')
                            ->orWhereIn('name', self::SELF_SERVICE_REQUESTS_PERMISSIONS);
                    })
                    ->get()
            );
        }
    }

    private function assignManagerPermissions(): void
    {
        // manager (position role): jefe de piso — can view/manage employees.
        // Does NOT get VACATION_REQUESTS_PATTERN — directly scheduling vacations
        // on behalf of an employee is admin/super-admin-only; manager still
        // reviews self-service vacation requests via employee-requests.approve.
        // Payroll is scoped explicitly (not the PAYROLL_PATTERN wildcard) so that
        // reopen/reclose — admin-only per AP-047 — never leak in here by accident.
        // items.view + items.manage-media only (not items.update, and not the
        // full ITEMS_PATTERN wildcard) — items.update also guards PUT
        // /items/{id} and PUT /item-variants/{id} (catalog identity fields),
        // so granting it just to satisfy
        // Item::userCanManageMedia() (#377) would silently hand manager full
        // catalog edit rights too. items.manage-media is the
        // dedicated permission that check actually looks for. media.* is the
        // full wildcard on purpose — managing an item's photos
        // (upload/reorder/delete) is the actual point.
        $managerRole = Role::where('name', 'manager')->where('guard_name', 'api')->first();
        if ($managerRole) {
            $managerRole->syncPermissions(
                Permission::where('guard_name', 'api')
                    ->where(function ($q) {
                        $q->whereIn('name', ['users.show', 'users.index', 'items.view', 'items.manage-media', 'brands.view', 'inventory_categories.view', 'purchase_presentation_templates.view', 'suppliers.view'])
                            ->orWhere('name', 'like', self::EMPLOYEES_PATTERN)
                            ->orWhere('name', 'like', self::LEAVES_PATTERN)
                            ->orWhere('name', 'like', self::EMPLOYEE_REQUESTS_PATTERN)
                            ->orWhere('name', 'like', self::REPORTS_PATTERN)
                            ->orWhere('name', 'like', self::ATTENDANCES_PATTERN)
                            ->orWhere('name', 'like', self::MEDIA_PATTERN)
                            ->orWhereIn('name', ['payroll.preview', 'payroll.close']);
                    })
                    ->get()
            );
        }
    }
}
