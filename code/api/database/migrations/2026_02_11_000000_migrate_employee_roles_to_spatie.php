<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Mapping from old enum values to new Spatie role names.
     */
    private const ROLE_MAP = [
        'MANAGER' => 'employee-manager',
        'COOK' => 'employee-cook',
        'KITCHEN_ASSISTANT' => 'employee-kitchen-assistant',
        'DELIVERY_DRIVER' => 'employee-delivery-driver',
    ];

    /**
     * New position roles to create (employee-manager already exists).
     */
    private const NEW_ROLES = [
        'employee-cook',
        'employee-kitchen-assistant',
        'employee-delivery-driver',
        'employee-acting-manager',
    ];

    public function up(): void
    {
        // 1. Create new Spatie roles (employee-manager already exists)
        foreach (self::NEW_ROLES as $roleName) {
            Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'api'],
                ['name' => $roleName, 'guard_name' => 'api']
            );
        }

        // 2. Migrate existing employees: assign Spatie role to Employee model
        $employees = DB::table('employees')->whereNotNull('role')->get();
        $employeeModelType = 'App\\Models\\Employee';

        foreach ($employees as $employee) {
            $spatieRoleName = self::ROLE_MAP[$employee->role] ?? null;
            if (! $spatieRoleName) {
                continue;
            }

            $role = DB::table('roles')
                ->where('name', $spatieRoleName)
                ->where('guard_name', 'api')
                ->first();

            if (! $role) {
                continue;
            }

            // Insert into model_has_roles (polymorphic — Employee, not User)
            DB::table('model_has_roles')->insertOrIgnore([
                'role_id' => $role->id,
                'model_type' => $employeeModelType,
                'model_id' => $employee->id,
            ]);
        }

        // 3. Drop the role column and its index
        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex(['role']);
        });

        // Drop the enum column (PostgreSQL requires raw SQL for enum columns)
        DB::statement('ALTER TABLE employees DROP COLUMN role');
    }

    public function down(): void
    {
        // 1. Re-create the enum column
        DB::statement("ALTER TABLE employees ADD COLUMN role VARCHAR(255)");

        // 2. Migrate data back from model_has_roles to the role column
        $employeeModelType = 'App\\Models\\Employee';
        $reverseMap = array_flip(self::ROLE_MAP);

        $entries = DB::table('model_has_roles')
            ->where('model_type', $employeeModelType)
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->select('model_has_roles.model_id', 'roles.name')
            ->get();

        foreach ($entries as $entry) {
            $enumValue = $reverseMap[$entry->name] ?? null;
            if ($enumValue) {
                DB::table('employees')
                    ->where('id', $entry->model_id)
                    ->update(['role' => $enumValue]);
            }
        }

        // 3. Clean up model_has_roles entries for Employee
        DB::table('model_has_roles')
            ->where('model_type', $employeeModelType)
            ->delete();

        // 4. Add index back
        Schema::table('employees', function (Blueprint $table) {
            $table->index('role');
        });

        // 5. Remove new roles (keep employee-manager as it existed before)
        DB::table('roles')
            ->whereIn('name', self::NEW_ROLES)
            ->where('guard_name', 'api')
            ->delete();
    }
};
