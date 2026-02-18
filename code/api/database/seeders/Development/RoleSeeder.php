<?php

namespace Database\Seeders\Development;

use App\Models\Employee;
use Database\Seeders\Base\LockedSeeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        // System roles — assigned to User (the authenticated identity).
        //
        // super-admin      : full system access. No employee profile.
        // admin            : operational management. Has employee profile.
        // inventory-manager: inventory access. Has employee profile.
        // employee-manager : team-lead, derived from position role sync.
        // employee         : base access for any active employee.
        // user             : generic fallback for non-employee accounts.
        $roles = [
            ['name' => 'super-admin',       'guard_name' => 'api'],
            ['name' => 'admin',             'guard_name' => 'api'],
            ['name' => 'inventory-manager', 'guard_name' => 'api'],
            ['name' => 'employee-manager',  'guard_name' => 'api'],
            ['name' => 'employee',          'guard_name' => 'api'],
            ['name' => 'user',              'guard_name' => 'api'],
        ];

        // Position roles (job titles) — also assigned to User via Employee.syncPositionRoles()
        foreach (Employee::POSITION_ROLES as $positionRole) {
            $roles[] = ['name' => $positionRole, 'guard_name' => 'api'];
        }

        foreach ($roles as $roleData) {
            Role::updateOrCreate(
                ['name' => $roleData['name'], 'guard_name' => $roleData['guard_name']],
                $roleData
            );
        }

        $this->command->info('✓ Development roles seeded successfully');
    }
}
