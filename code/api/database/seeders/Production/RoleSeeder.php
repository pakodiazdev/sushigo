<?php

namespace Database\Seeders\Production;

use App\Models\Employee;
use Database\Seeders\Base\LockedSeeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        // System roles
        $roles = [
            ['name' => 'super-admin', 'guard_name' => 'api'],
            ['name' => 'admin', 'guard_name' => 'api'],
            ['name' => 'user', 'guard_name' => 'api'],
            ['name' => 'employee', 'guard_name' => 'api'],
        ];

        // Position roles from Employee model (single source of truth)
        foreach (Employee::POSITION_ROLES as $positionRole) {
            $roles[] = ['name' => $positionRole, 'guard_name' => 'api'];
        }

        foreach ($roles as $roleData) {
            Role::updateOrCreate(
                ['name' => $roleData['name'], 'guard_name' => $roleData['guard_name']],
                $roleData
            );
        }

        $this->command->info('✓ Production roles seeded successfully');
    }
}
