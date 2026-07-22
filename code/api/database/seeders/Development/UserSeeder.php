<?php

namespace Database\Seeders\Development;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use App\Models\OperatingUnit;
use App\Models\User;
use Carbon\Carbon;
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

        // Branch required for employment periods
        $branch = Branch::first();

        foreach ($users as $userData) {
            $user = $this->createOrUpdateUser($userData);
            $this->seedEmployeeForUser($user, $userData, $branch);
            $this->assignOperatingUnits($user, $userData, $mainUnit, $bufferUnit, $returnUnit);
        }

        $this->command->info('✓ Development users seeded successfully');
    }

    private function createOrUpdateUser(array $userData): User
    {
        $user = User::updateOrCreate(
            ['email' => $userData['email']],
            [
                'first_name' => $userData['first_name'],
                'last_name' => $userData['last_name'],
                'password' => Hash::make($userData['password']),
                'email_verified_at' => now(),
            ]
        );

        $this->command->info("✓ User created: {$userData['email']}");

        // Assign system role (admin, super-admin, inventory-manager)
        if (isset($userData['role']) && ! $user->hasRole($userData['role'])) {
            $user->assignRole($userData['role']);
        }

        return $user;
    }

    /**
     * Create Employee + active EmploymentPeriod for users that represent employees.
     * We create directly (not via CreateEmployeeAction) because the User already
     * exists — we just link the Employee record to it.
     */
    private function seedEmployeeForUser(User $user, array $userData, ?Branch $branch): void
    {
        if (! isset($userData['employee']) || ! $branch) {
            return;
        }

        $empData = $userData['employee'];
        $empCode = $empData['code'];
        $hireDate = now()->subYear()->startOfDay(); // hired ~1 year ago

        $employee = Employee::where('code', $empCode)->first();

        if (! $employee) {
            $this->createEmployeeWithActivePeriod($user, $branch, $empData, $empCode, $hireDate);

            return;
        }

        $this->ensureActiveEmploymentPeriod($employee, $branch, $empCode, $hireDate);
    }

    private function createEmployeeWithActivePeriod(User $user, Branch $branch, array $empData, string $empCode, Carbon $hireDate): void
    {
        $employee = Employee::create([
            'user_id' => $user->id,
            'code' => $empCode,
            'is_active' => true,
            'attendance_exempt' => $empData['attendance_exempt'] ?? false,
            'created_at' => $hireDate,
            'updated_at' => $hireDate,
        ]);

        // Assign position roles to the linked user
        $positionRoles = $empData['position_roles'] ?? ['manager'];
        $employee->syncPositionRoles($positionRoles, null); // null = unrestricted (seeder context)

        // Create active employment period from hire date
        EmploymentPeriod::create([
            'employee_id' => $employee->id,
            'branch_id' => $branch->id,
            'start_date' => $hireDate->toDateString(),
            'is_active' => true,
            'created_at' => $hireDate,
            'updated_at' => $hireDate,
        ]);

        $roles = implode(', ', $positionRoles);
        $this->command->info("  → Employee {$empCode} created with active period from {$hireDate->toDateString()} (roles: {$roles})");
    }

    private function ensureActiveEmploymentPeriod(Employee $employee, Branch $branch, string $empCode, Carbon $hireDate): void
    {
        if ($employee->employmentPeriods()->active()->exists()) {
            $this->command->info("  ⏭ Employee {$empCode} already has an active period, skipping");

            return;
        }

        EmploymentPeriod::create([
            'employee_id' => $employee->id,
            'branch_id' => $branch->id,
            'start_date' => $hireDate->toDateString(),
            'is_active' => true,
            'created_at' => $hireDate,
            'updated_at' => $hireDate,
        ]);
        $this->command->info("  → Active employment period added to existing employee {$empCode}");
    }

    private function assignOperatingUnits(User $user, array $userData, ?OperatingUnit $mainUnit, ?OperatingUnit $bufferUnit, ?OperatingUnit $returnUnit): void
    {
        // Assign users to operating units based on their role
        if ($mainUnit) {
            $this->attachUnitIfMissing($user, $mainUnit, $this->assignmentRoleForMainUnit($userData['role']));
        }

        // Super admin and admin get access to all units
        if (in_array($userData['role'], ['super-admin', 'admin'])) {
            $assignmentRole = $userData['role'] === 'super-admin' ? 'OWNER' : 'MANAGER';

            if ($bufferUnit) {
                $this->attachUnitIfMissing($user, $bufferUnit, $assignmentRole);
            }
            if ($returnUnit) {
                $this->attachUnitIfMissing($user, $returnUnit, $assignmentRole);
            }
        }

        // Inventory manager gets access to main and buffer
        if ($userData['role'] === 'inventory-manager' && $bufferUnit) {
            $this->attachUnitIfMissing($user, $bufferUnit, 'INVENTORY');
        }
    }

    private function assignmentRoleForMainUnit(string $role): string
    {
        return match ($role) {
            'super-admin' => 'OWNER',
            'admin' => 'MANAGER',
            default => 'INVENTORY',
        };
    }

    private function attachUnitIfMissing(User $user, OperatingUnit $unit, string $assignmentRole): void
    {
        if ($user->operatingUnits()->where('operating_unit_id', $unit->id)->exists()) {
            return;
        }

        $user->operatingUnits()->attach($unit->id, ['assignment_role' => $assignmentRole]);
        $this->command->info("  → Assigned to: {$unit->name} as {$assignmentRole}");
    }
}
