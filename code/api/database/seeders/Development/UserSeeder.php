<?php

namespace Database\Seeders\Development;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
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
        $mainUnit   = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_MAIN)->first();
        $bufferUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_BUFFER)->first();
        $returnUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_RETURN)->first();

        // Branch required for employment periods
        $branch = Branch::first();

        foreach ($users as $userData) {
            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name'              => $userData['name'],
                    'password'          => Hash::make($userData['password']),
                    'email_verified_at' => now(),
                ]
            );

            $this->command->info("✓ User created: {$userData['email']}");

            // Assign system role (admin, super-admin, inventory-manager)
            if (isset($userData['role']) && ! $user->hasRole($userData['role'])) {
                $user->assignRole($userData['role']);
            }

            // Create Employee + active EmploymentPeriod for users that represent employees.
            // We create directly (not via CreateEmployeeAction) because the User already
            // exists — we just link the Employee record to it.
            if (isset($userData['employee']) && $branch) {
                $empData  = $userData['employee'];
                $empCode  = $empData['code'];
                $hireDate = now()->subYear()->startOfDay(); // hired ~1 year ago

                if (! Employee::where('code', $empCode)->exists()) {
                    $employee = Employee::create([
                        'user_id'    => $user->id,
                        'code'       => $empCode,
                        'first_name' => $empData['first_name'],
                        'last_name'  => $empData['last_name'],
                        'is_active'  => true,
                        'created_at' => $hireDate,
                        'updated_at' => $hireDate,
                    ]);

                    // Assign position roles to the linked user
                    $positionRoles = $empData['position_roles'] ?? ['manager'];
                    $employee->syncPositionRoles($positionRoles, null); // null = unrestricted (seeder context)

                    // Create active employment period from hire date
                    EmploymentPeriod::create([
                        'employee_id' => $employee->id,
                        'branch_id'   => $branch->id,
                        'start_date'  => $hireDate->toDateString(),
                        'is_active'   => true,
                        'created_at'  => $hireDate,
                        'updated_at'  => $hireDate,
                    ]);

                    $roles = implode(', ', $positionRoles);
                    $this->command->info("  → Employee {$empCode} created with active period from {$hireDate->toDateString()} (roles: {$roles})");
                } else {
                    // Employee exists — ensure it has at least one active period
                    $employee = Employee::where('code', $empCode)->first();

                    if (! $employee->employmentPeriods()->active()->exists()) {
                        EmploymentPeriod::create([
                            'employee_id' => $employee->id,
                            'branch_id'   => $branch->id,
                            'start_date'  => $hireDate->toDateString(),
                            'is_active'   => true,
                            'created_at'  => $hireDate,
                            'updated_at'  => $hireDate,
                        ]);
                        $this->command->info("  → Active employment period added to existing employee {$empCode}");
                    } else {
                        $this->command->info("  ⏭ Employee {$empCode} already has an active period, skipping");
                    }
                }
            }

            // Assign users to operating units based on their role
            if ($mainUnit) {
                if (! $user->operatingUnits()->where('operating_unit_id', $mainUnit->id)->exists()) {
                    $assignmentRole = match ($userData['role']) {
                        'super-admin' => 'OWNER',
                        'admin'       => 'MANAGER',
                        default       => 'INVENTORY',
                    };
                    $user->operatingUnits()->attach($mainUnit->id, ['assignment_role' => $assignmentRole]);
                    $this->command->info("  → Assigned to: {$mainUnit->name} as {$assignmentRole}");
                }
            }

            // Super admin and admin get access to all units
            if (in_array($userData['role'], ['super-admin', 'admin'])) {
                if ($bufferUnit && ! $user->operatingUnits()->where('operating_unit_id', $bufferUnit->id)->exists()) {
                    $assignmentRole = $userData['role'] === 'super-admin' ? 'OWNER' : 'MANAGER';
                    $user->operatingUnits()->attach($bufferUnit->id, ['assignment_role' => $assignmentRole]);
                    $this->command->info("  → Assigned to: {$bufferUnit->name} as {$assignmentRole}");
                }
                if ($returnUnit && ! $user->operatingUnits()->where('operating_unit_id', $returnUnit->id)->exists()) {
                    $assignmentRole = $userData['role'] === 'super-admin' ? 'OWNER' : 'MANAGER';
                    $user->operatingUnits()->attach($returnUnit->id, ['assignment_role' => $assignmentRole]);
                    $this->command->info("  → Assigned to: {$returnUnit->name} as {$assignmentRole}");
                }
            }

            // Inventory manager gets access to main and buffer
            if ($userData['role'] === 'inventory-manager' && $bufferUnit) {
                if (! $user->operatingUnits()->where('operating_unit_id', $bufferUnit->id)->exists()) {
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
