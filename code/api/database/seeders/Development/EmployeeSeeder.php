<?php

namespace Database\Seeders\Development;

use App\Actions\Employee\CreateEmployeeAction;
use App\Models\Employee;
use Database\Seeders\Base\OnceSeeder;

class EmployeeSeeder extends OnceSeeder
{
    /**
     * Legacy role mapping for backward compatibility with old config format.
     */
    private const LEGACY_ROLE_MAP = [
        'MANAGER' => 'employee-manager',
        'COOK' => 'employee-cook',
        'KITCHEN_ASSISTANT' => 'employee-kitchen-assistant',
        'DELIVERY_DRIVER' => 'employee-delivery-driver',
    ];

    public function run(): void
    {
        $action = app(CreateEmployeeAction::class);

        $employees = config('seeders.development_employees', []);

        foreach ($employees as $employeeData) {
            // Skip if employee code already exists
            if (Employee::where('code', $employeeData['code'])->exists()) {
                $this->command->info("⏭ Employee {$employeeData['code']} already exists, skipping");
                continue;
            }

            // Backward compatibility: convert legacy 'role' to 'roles' array
            if (isset($employeeData['role']) && !isset($employeeData['roles'])) {
                $legacyRole = strtoupper($employeeData['role']);
                $employeeData['roles'] = [self::LEGACY_ROLE_MAP[$legacyRole] ?? 'employee-cook'];
                unset($employeeData['role']);
            }

            $employee = $action($employeeData);

            $credential = $employee->user->email ?? $employee->user->phone ?? 'N/A';
            $roles = $employee->getRoleNames()->implode(', ');

            $this->command->info("✓ Employee created: {$employee->code} - {$employee->first_name} {$employee->last_name} (user: {$credential}, roles: {$roles})");
        }

        // Create random employees without system users via factory
        $factoryCount = config('seeders.factory_counts.employees', 5);
        Employee::factory($factoryCount)->create();
        $this->command->info("✓ Created {$factoryCount} random employees (factory)");

        $this->command->info('✓ Development employees seeded successfully');
    }
}
