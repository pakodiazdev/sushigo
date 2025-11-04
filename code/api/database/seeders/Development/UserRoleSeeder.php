<?php

namespace Database\Seeders\Development;

use App\Models\User;
use Database\Seeders\Base\OnceSeeder;
use Spatie\Permission\Models\Role;

class UserRoleSeeder extends OnceSeeder
{
    public function run(): void
    {
        $adminUser = User::where('email', 'admin@sushigo.com')->first();
        if ($adminUser) {
            $superAdminRole = Role::where('name', 'super-admin')
                ->where('guard_name', 'api')
                ->first();
            if ($superAdminRole) {
                $adminUser->assignRole($superAdminRole);
                $this->command->info("✓ Assigned 'super-admin' role to admin@sushigo.com");
            }
        }

        $demoUser = User::where('email', 'demo@sushigo.com')->first();
        if ($demoUser) {
            $userRole = Role::where('name', 'user')
                ->where('guard_name', 'api')
                ->first();
            if ($userRole) {
                $demoUser->assignRole($userRole);
                $this->command->info("✓ Assigned 'user' role to demo@sushigo.com");
            }
        }

        $testUser = User::where('email', 'test@example.com')->first();
        if ($testUser) {
            $userRole = Role::where('name', 'user')
                ->where('guard_name', 'api')
                ->first();
            if ($userRole) {
                $testUser->assignRole($userRole);
                $this->command->info("✓ Assigned 'user' role to test@example.com");
            }
        }

        $this->command->info('✓ Development user roles assigned successfully');
    }
}
