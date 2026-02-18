<?php

namespace Database\Seeders\Development;

use App\Models\Employee;
use Database\Seeders\Base\LockedSeeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        // Administrative roles — assigned to User (the authenticated identity).
        //
        // super-admin      : full system access (owner, partner). May have employee profile.
        // admin            : operational management (manager, general). May have employee profile.
        // inventory-manager: inventory access. May have employee profile.
        //
        // Position roles (job titles) are assigned to Users linked to Employee records
        // via Employee.syncPositionRoles(). They reflect the person's role in the organization.
        // Being an employee is determined by having an Employee record, not by a role.
        $roles = [
            ['name' => 'super-admin',       'guard_name' => 'api'],
            ['name' => 'admin',             'guard_name' => 'api'],
            ['name' => 'inventory-manager', 'guard_name' => 'api'],
        ];

        // Position roles (manager, cook, kitchen-assistant, delivery-driver, acting-manager)
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
