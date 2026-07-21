<?php

namespace Database\Seeders\Development;

use App\Models\Employee;
use App\Models\User;
use App\Repositories\EmployeeRepository;
use Database\Seeders\Base\OnceSeeder;

/**
 * Links admin/inventory-manager users to Employee records.
 *
 * The super-admin is intentionally excluded — it is a system-level
 * account with no real-world employee profile.
 *
 * Roles live on User (authenticated identity). Employee is just a
 * profile that describes the person behind the account.
 * syncPositionRoles() adds position roles to the User while preserving
 * any existing system roles (admin, inventory-manager, etc.).
 */
class AdminEmployeeSeeder extends OnceSeeder
{
    public function run(): void
    {
        $employeeRepository = app(EmployeeRepository::class);

        $users = config('seeders.development_users', []);

        foreach ($users as $userData) {
            // Only process users that have an employee profile defined
            if (empty($userData['employee'])) {
                continue;
            }

            $user = User::where('email', $userData['email'])->first();

            if (! $user) {
                $this->command->warn("⚠ User {$userData['email']} not found, skipping employee profile");

                continue;
            }

            $employeeData = $userData['employee'];

            // Skip if employee code already exists
            if (Employee::where('code', $employeeData['code'])->exists()) {
                $this->command->info("⏭ Employee {$employeeData['code']} already exists, skipping");

                continue;
            }

            $employee = $employeeRepository->create([
                'user_id' => $user->id,
                'code' => $employeeData['code'],
                'is_active' => true,
                'attendance_exempt' => $employeeData['attendance_exempt'] ?? false,
            ]);

            // Sync position roles onto the User (preserves admin/inventory-manager roles)
            $employee->syncPositionRoles($employeeData['position_roles'] ?? [], null); // null = unrestricted (seeder context)

            $roles = $user->fresh()->getRoleNames()->implode(', ');
            $this->command->info("✓ Employee profile linked: {$employeeData['code']} → {$userData['email']} (user roles: {$roles})");
        }

        $this->command->info('✓ Admin employee profiles seeded successfully');
    }
}
