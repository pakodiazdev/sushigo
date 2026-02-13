<?php

namespace Database\Seeders\Production;

use Database\Seeders\Base\LockedSeeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends LockedSeeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'super-admin', 'guard_name' => 'api'],
            ['name' => 'admin', 'guard_name' => 'api'],
            ['name' => 'user', 'guard_name' => 'api'],
            ['name' => 'employee', 'guard_name' => 'api'],
            ['name' => 'employee-manager', 'guard_name' => 'api'],
            ['name' => 'employee-cook', 'guard_name' => 'api'],
            ['name' => 'employee-kitchen-assistant', 'guard_name' => 'api'],
            ['name' => 'employee-delivery-driver', 'guard_name' => 'api'],
            ['name' => 'employee-acting-manager', 'guard_name' => 'api'],
        ];

        foreach ($roles as $roleData) {
            Role::updateOrCreate(
                ['name' => $roleData['name'], 'guard_name' => $roleData['guard_name']],
                $roleData
            );
        }

        $this->command->info('✓ Production roles seeded successfully');
    }
}
