<?php

namespace Database\Seeders\Development;

use App\Models\OperatingUnit;
use App\Models\User;
use Database\Seeders\Base\OnceSeeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends OnceSeeder
{
    public function run(): void
    {
        $users = config('seeders.development_users', []);

        // Get operating units for assignments
        $mainUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_MAIN)->first();
        $bufferUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_BUFFER)->first();
        $returnUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_RETURN)->first();

        foreach ($users as $userData) {
            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => Hash::make($userData['password']),
                    'email_verified_at' => now(),
                ]
            );

            $this->command->info("✓ User created: {$userData['email']}");

            // Assign users to operating units based on their role
            if ($mainUnit) {
                if (!$user->operatingUnits()->where('operating_unit_id', $mainUnit->id)->exists()) {
                    $assignmentRole = match ($userData['role']) {
                        'super-admin' => 'OWNER',
                        'admin' => 'MANAGER',
                        'inventory-manager' => 'INVENTORY',
                        default => 'INVENTORY',
                    };
                    $user->operatingUnits()->attach($mainUnit->id, ['assignment_role' => $assignmentRole]);
                    $this->command->info("  → Assigned to: {$mainUnit->name} as {$assignmentRole}");
                }
            }

            // Super admin and admin get access to all units
            if (in_array($userData['role'], ['super-admin', 'admin'])) {
                if ($bufferUnit && !$user->operatingUnits()->where('operating_unit_id', $bufferUnit->id)->exists()) {
                    $assignmentRole = $userData['role'] === 'super-admin' ? 'OWNER' : 'MANAGER';
                    $user->operatingUnits()->attach($bufferUnit->id, ['assignment_role' => $assignmentRole]);
                    $this->command->info("  → Assigned to: {$bufferUnit->name} as {$assignmentRole}");
                }
                if ($returnUnit && !$user->operatingUnits()->where('operating_unit_id', $returnUnit->id)->exists()) {
                    $assignmentRole = $userData['role'] === 'super-admin' ? 'OWNER' : 'MANAGER';
                    $user->operatingUnits()->attach($returnUnit->id, ['assignment_role' => $assignmentRole]);
                    $this->command->info("  → Assigned to: {$returnUnit->name} as {$assignmentRole}");
                }
            }

            // Inventory manager gets access to main and buffer
            if ($userData['role'] === 'inventory-manager' && $bufferUnit) {
                if (!$user->operatingUnits()->where('operating_unit_id', $bufferUnit->id)->exists()) {
                    $user->operatingUnits()->attach($bufferUnit->id, ['assignment_role' => 'INVENTORY']);
                    $this->command->info("  → Assigned to: {$bufferUnit->name} as INVENTORY");
                }
            }
        }

        $factoryCount = config('seeders.factory_counts.users', 10);
        User::factory($factoryCount)->create();
        $this->command->info("✓ Created {$factoryCount} random users");

        $this->command->info('✓ Development users seeded successfully');
    }
}
