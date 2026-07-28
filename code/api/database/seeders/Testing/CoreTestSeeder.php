<?php

namespace Database\Seeders\Testing;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

/**
 * Core test seeder — minimal data for any test scenario.
 *
 * Creates: Passport clients, roles, permissions, branch, operating units, system users.
 * No idempotency checks — always starts from truncated tables.
 * Optimized for speed: bulk DB::table()->insert(), single Hash::make(), no Eloquent events.
 */
class CoreTestSeeder extends Seeder
{
    // ── Role & permission definitions ──────────────────────────────────────

    private const GUARD = 'api';

    private const ROLES = [
        'super-admin',
        'admin',
        'inventory-manager',
        'manager',
        'cook',
        'kitchen-assistant',
        'delivery-driver',
        'acting-manager',
    ];

    private const PERMISSIONS = [
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
        'cash_registers.view',
        'cash_registers.create',
        'cash_registers.update',
        'cash_registers.delete',
        'cash_terminals.view',
        'cash_terminals.create',
        'cash_terminals.update',
        'cash_terminals.delete',
        'bank_accounts.view',
        'bank_accounts.create',
        'bank_accounts.update',
        'bank_accounts.delete',
        'cash_sessions.view',
        'cash_sessions.create',
        'cash_sessions.update',
        'cash_sessions.post',
        'cash_adjustments.view',
        'cash_adjustments.create',
        'cash_adjustments.update',
        'cash_adjustments.delete',
        'cash_adjustments.post',
        'cash_expenses.view',
        'cash_expenses.create',
        'cash_expenses.update',
        'cash_expenses.delete',
        'cash_expenses.post',
        'employees.view',
        'employees.create',
        'employees.update',
        'leaves.register-direct',
        'leaves.request',
        'leaves.approve',
        'leaves.reject',
        'vacation-requests.schedule',
        'vacation-requests.approve',
        'vacation-requests.reject',
        'employee-requests.view',
        'employee-requests.create',
        'employee-requests.approve',
        'employee-requests.cancel',
        'items.view',
        'items.create',
        'items.update',
        'items.delete',
        'inventory_locations.view',
        'inventory_locations.manage',
        'units_of_measure.manage',
        'stock.view',
        'stock.manage',
        'attendances.view',
        'attendances.create',
        'attendances.update',
        'punctuality.manage',
        'reports.today',
        'reports.weekly-summary',
        'holidays.manage',
        'payroll.preview',
        'payroll.close',
        'payroll.reopen',
        'payroll.reclose',
        'overtime.manage',
        'vacation-policy.manage',
        'audit-logs.view',
    ];

    /** Basic view-only user permissions shared by most roles */
    private const BASIC_USER_VIEW = ['=users.show', '=users.index'];

    /**
     * Self-service Solicitudes access — every employee can view/create/cancel
     * their own requests, including self-service vacation requests (via the
     * generic employee-requests.create), but never approve or directly
     * schedule vacations on behalf of someone else (that stays admin-only —
     * see vacation-requests.schedule).
     */
    private const SELF_SERVICE_REQUESTS = [
        '=employee-requests.view',
        '=employee-requests.create',
        '=employee-requests.cancel',
    ];

    /** role name => permission name prefixes or exact names */
    private const ROLE_PERMISSIONS = [
        'super-admin' => '*',  // all permissions
        'admin' => ['users.', 'employees.', 'leaves.', 'vacation-requests.', 'vacation-policy.', 'employee-requests.', 'items.', 'inventory_locations.', 'stock.', 'attendances.', 'punctuality.', 'reports.', 'holidays.', 'payroll.', 'overtime.', 'audit-logs.', '=units_of_measure.manage'],
        'inventory-manager' => ['items.', 'inventory_locations.', 'stock.', '=units_of_measure.manage', ...self::SELF_SERVICE_REQUESTS],
        'manager' => [...self::BASIC_USER_VIEW, 'employees.', 'leaves.', 'employee-requests.', 'attendances.', 'reports.', '=payroll.preview', '=payroll.close'],
        'cook' => [...self::BASIC_USER_VIEW, ...self::SELF_SERVICE_REQUESTS],
        'kitchen-assistant' => [...self::BASIC_USER_VIEW, ...self::SELF_SERVICE_REQUESTS],
        'delivery-driver' => [...self::BASIC_USER_VIEW, ...self::SELF_SERVICE_REQUESTS],
        'acting-manager' => [...self::BASIC_USER_VIEW, ...self::SELF_SERVICE_REQUESTS],
    ];

    // ── Operating unit types (mirrored from OperatingUnit model) ───────────

    private const TYPE_BRANCH_MAIN = 'BRANCH_MAIN';

    private const TYPE_BRANCH_BUFFER = 'BRANCH_BUFFER';

    private const TYPE_BRANCH_RETURN = 'BRANCH_RETURN';

    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->seedPassportClients();

        [$roleMap, $permMap] = $this->seedRolesAndPermissions();
        $this->seedRolePermissionPivots($roleMap, $permMap);

        [, $unitIds] = $this->seedBranchAndUnits();
        $this->seedUsers($roleMap, $unitIds);
        $this->seedLeaveTypes();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    private function seedPassportClients(): void
    {
        $now = now();

        DB::table('oauth_clients')->insert([
            [
                'id' => Str::uuid()->toString(),
                'owner_type' => null,
                'owner_id' => null,
                'name' => 'SushiGo Personal Access Client',
                'secret' => hash('sha256', Str::random(40)),
                'provider' => null,
                'redirect_uris' => json_encode([config('app.url')]),
                'grant_types' => json_encode(['personal_access']),
                'revoked' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => Str::uuid()->toString(),
                'owner_type' => null,
                'owner_id' => null,
                'name' => 'SushiGo Password Grant Client',
                'secret' => hash('sha256', Str::random(40)),
                'provider' => 'users',
                'redirect_uris' => json_encode([config('app.url')]),
                'grant_types' => json_encode(['password', 'refresh_token']),
                'revoked' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Bulk insert roles and permissions. Returns [roleMap, permMap] with name => id.
     *
     * @return array{0: array<string, int>, 1: array<string, int>}
     */
    private function seedRolesAndPermissions(): array
    {
        $now = now();

        // Bulk insert roles
        $roleRows = [];
        foreach (self::ROLES as $name) {
            $roleRows[] = [
                'name' => $name,
                'guard_name' => self::GUARD,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        DB::table('roles')->insert($roleRows);

        // Build role name => id map
        $roleMap = DB::table('roles')
            ->where('guard_name', self::GUARD)
            ->pluck('id', 'name')
            ->toArray();

        // Bulk insert permissions
        $permRows = [];
        foreach (self::PERMISSIONS as $name) {
            $permRows[] = [
                'name' => $name,
                'guard_name' => self::GUARD,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        DB::table('permissions')->insert($permRows);

        // Build permission name => id map
        $permMap = DB::table('permissions')
            ->where('guard_name', self::GUARD)
            ->pluck('id', 'name')
            ->toArray();

        return [$roleMap, $permMap];
    }

    /**
     * Bulk insert role_has_permissions pivots based on ROLE_PERMISSIONS config.
     *
     * @param  array<string, int>  $roleMap
     * @param  array<string, int>  $permMap
     */
    private function seedRolePermissionPivots(array $roleMap, array $permMap): void
    {
        $pivots = [];

        foreach (self::ROLE_PERMISSIONS as $roleName => $rules) {
            $roleId = $roleMap[$roleName];

            if ($rules === '*') {
                foreach ($permMap as $permId) {
                    $pivots[] = ['permission_id' => $permId, 'role_id' => $roleId];
                }

                continue;
            }

            foreach ($permMap as $permName => $permId) {
                if ($this->matchesAnyRule($permName, $rules)) {
                    $pivots[] = ['permission_id' => $permId, 'role_id' => $roleId];
                }
            }
        }

        DB::table('role_has_permissions')->insert($pivots);
    }

    private function matchesAnyRule(string $permName, array $rules): bool
    {
        foreach ($rules as $rule) {
            if (str_starts_with($rule, '=') && $permName === substr($rule, 1)) {
                return true;
            }
            if (! str_starts_with($rule, '=') && str_starts_with($permName, $rule)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Bulk insert branch and operating units. Returns [branchId, unitIds keyed by type].
     *
     * @return array{0: int, 1: array<string, int>}
     */
    private function seedBranchAndUnits(): array
    {
        $now = now();

        $branchId = DB::table('branches')->insertGetId([
            'code' => 'MAIN',
            'name' => 'SushiGo Principal',
            'region' => 'CDMX',
            'timezone' => 'America/Mexico_City',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $units = [
            ['name' => 'Inventario Principal', 'type' => self::TYPE_BRANCH_MAIN],
            ['name' => 'Área de Recepción', 'type' => self::TYPE_BRANCH_BUFFER],
            ['name' => 'Devoluciones', 'type' => self::TYPE_BRANCH_RETURN],
        ];

        $unitIds = [];
        foreach ($units as $unit) {
            $unitIds[$unit['type']] = DB::table('operating_units')->insertGetId([
                'branch_id' => $branchId,
                'name' => $unit['name'],
                'type' => $unit['type'],
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        return [$branchId, $unitIds];
    }

    /**
     * Bulk insert system users + role assignments + operating unit assignments.
     *
     * @param  array<string, int>  $roleMap
     * @param  array<string, int>  $unitIds
     */
    private function seedUsers(array $roleMap, array $unitIds): void
    {
        $now = now();
        $adminHash = Hash::make(config('seeders.passwords.admin'));
        $inventoryHash = Hash::make(config('seeders.passwords.inventory'));
        $employeeHash = Hash::make(config('seeders.passwords.employee'));

        $userModel = User::class;
        $allUnitIds = array_values($unitIds);
        $mainBufferIds = [$unitIds[self::TYPE_BRANCH_MAIN], $unitIds[self::TYPE_BRANCH_BUFFER]];

        // Define users
        $users = [
            [
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'superadmin@sushigo.com',
                'password' => $adminHash,
                'email_verified_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
                '_role' => 'super-admin',
                '_unit_role' => 'OWNER',
                '_units' => $allUnitIds,
            ],
            [
                'first_name' => 'Admin',
                'last_name' => 'User',
                'email' => 'admin@sushigo.com',
                'password' => $adminHash,
                'email_verified_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
                '_role' => 'admin',
                '_unit_role' => 'MANAGER',
                '_units' => $allUnitIds,
            ],
            [
                'first_name' => 'Inventory',
                'last_name' => 'Manager',
                'email' => 'inventory@sushigo.com',
                'password' => $inventoryHash,
                'email_verified_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
                '_role' => 'inventory-manager',
                '_unit_role' => 'INVENTORY',
                '_units' => $mainBufferIds,
            ],
            [
                'first_name' => 'Branch',
                'last_name' => 'Manager',
                'email' => 'manager@sushigo.com',
                'password' => $employeeHash,
                'email_verified_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
                '_role' => 'manager',
                '_unit_role' => 'MANAGER',
                '_units' => $mainBufferIds,
            ],
        ];

        $rolePivots = [];
        $unitPivots = [];

        foreach ($users as $userData) {
            $role = $userData['_role'];
            $unitRole = $userData['_unit_role'];
            $unitAssignments = $userData['_units'];
            unset($userData['_role'], $userData['_unit_role'], $userData['_units']);

            $userId = DB::table('users')->insertGetId($userData);

            $rolePivots[] = [
                'role_id' => $roleMap[$role],
                'model_type' => $userModel,
                'model_id' => $userId,
            ];

            foreach ($unitAssignments as $unitId) {
                $unitPivots[] = [
                    'user_id' => $userId,
                    'operating_unit_id' => $unitId,
                    'assignment_role' => $unitRole,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('model_has_roles')->insert($rolePivots);
        DB::table('operating_unit_users')->insert($unitPivots);
    }

    private function seedLeaveTypes(): void
    {
        $now = now();

        DB::table('leave_types')->insert([
            $this->leaveTypeRow('MEDICAL', 'Incapacidad médica', 'FIXED_PERCENTAGE', 'NONE', $now),
            $this->leaveTypeRow('PERSONAL', 'Permiso personal', 'FIXED_PERCENTAGE', 'NONE', $now),
            $this->leaveTypeRow('PERMISSION', 'Permiso', 'FIXED_PERCENTAGE', 'NONE', $now),
            $this->leaveTypeRow('PERMISSION_HOURS', 'Permiso por horas', 'PROPORTIONAL_HOURS', 'PROPORTIONAL', $now),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function leaveTypeRow(string $code, string $name, string $calculationMode, string $restDayFactor, Carbon $now): array
    {
        return [
            'code' => $code,
            'name' => $name,
            'calculation_mode' => $calculationMode,
            'default_pay_percentage' => 0.00,
            'default_rest_day_factor' => $restDayFactor,
            'counts_for_bonus' => false,
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }
}
