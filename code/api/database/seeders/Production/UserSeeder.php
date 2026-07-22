<?php

namespace Database\Seeders\Production;

use App\Models\OperatingUnit;
use App\Models\User;
use Database\Seeders\Base\OnceSeeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        $this->command->info('👥 Checking production users...');

        // Check if there are already admin users in the system
        $adminCount = User::role(['super-admin', 'admin'])->count();

        if ($adminCount > 0) {
            $this->command->info("✓ Found {$adminCount} admin user(s) in the system");
            $this->command->info('✓ Skipping default admin creation (system already has administrators)');

            return;
        }

        $this->command->warn('⚠️  No admin users found. Creating default admin for initial setup...');
        $this->command->newLine();

        // Default admin user for system initialization
        // ⚠️ SECURITY WARNING: This user should be disabled or removed after initial setup
        $defaultUsers = [
            [
                'first_name' => 'Sistema',
                'last_name' => 'Admin',
                'email' => 'admin@sushigo.com',
                'password' => config('seeders.passwords.admin'), // ⚠️ Change this password immediately after first login
                'role' => 'super-admin',
            ],
        ];

        // Get main operating unit for assignments
        $mainUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_MAIN)->first();

        foreach ($defaultUsers as $userData) {
            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'first_name' => $userData['first_name'],
                    'last_name' => $userData['last_name'],
                    'password' => Hash::make($userData['password']),
                    'email_verified_at' => now(),
                ]
            );

            // Assign role with correct guard
            if (! $user->hasRole($userData['role'], 'api')) {
                $user->assignRole($userData['role']);
            }

            $this->command->warn("⚠️  Default user created: {$userData['email']}");
            $this->command->warn("   Password: {$userData['password']}");
            $this->command->warn('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');

            // Assign to main operating unit as OWNER
            if ($mainUnit && ! $user->operatingUnits()->where('operating_unit_id', $mainUnit->id)->exists()) {
                $user->operatingUnits()->attach($mainUnit->id, ['assignment_role' => 'OWNER']);
                $this->command->info("  → Assigned to: {$mainUnit->name} as OWNER");
            }
        }

        $this->command->newLine();
        $this->command->warn('⚠️  SECURITY REMINDER:');
        $this->command->warn('   1. Change default passwords immediately');
        $this->command->warn('   2. Create proper admin users');
        $this->command->warn('   3. Disable or delete default users after setup');
        $this->command->newLine();

        $this->command->info('✓ Production users seeded successfully');
    }
}
