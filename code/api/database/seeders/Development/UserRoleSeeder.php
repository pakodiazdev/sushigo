<?php

namespace Database\Seeders\Development;

use App\Models\User;
use Database\Seeders\Base\OnceSeeder;
use Spatie\Permission\Models\Role;

class UserRoleSeeder extends OnceSeeder
{
    public function run(): void
    {
        // Assign roles from config-driven development users
        $users = config('seeders.development_users', []);

        foreach ($users as $userData) {
            $user = User::where('email', $userData['email'])->first();
            if ($user) {
                $role = Role::where('name', $userData['role'])
                    ->where('guard_name', 'api')
                    ->first();
                if ($role && ! $user->hasRole($role)) {
                    $user->assignRole($role);
                    $this->command->info("✓ Assigned '{$userData['role']}' role to {$userData['email']}");
                }
            }
        }

        // Assign default 'user' role to demo and test users
        $defaultRoleUsers = ['demo@sushigo.com', 'test@example.com'];
        $userRole = Role::where('name', 'user')->where('guard_name', 'api')->first();

        if ($userRole) {
            foreach ($defaultRoleUsers as $email) {
                $user = User::where('email', $email)->first();
                if ($user && ! $user->hasRole($userRole)) {
                    $user->assignRole($userRole);
                    $this->command->info("✓ Assigned 'user' role to {$email}");
                }
            }
        }

        $this->command->info('✓ Development user roles assigned successfully');
    }
}
