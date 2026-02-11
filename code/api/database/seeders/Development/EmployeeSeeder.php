<?php

namespace Database\Seeders\Development;

use App\Actions\Employee\CreateEmployeeAction;
use App\Enums\EmployeeRole;
use App\Models\Employee;
use Database\Seeders\Base\OnceSeeder;

class EmployeeSeeder extends OnceSeeder
{
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

            $employee = $action($employeeData);

            $credential = $employee->user->email ?? $employee->user->phone ?? 'N/A';
            $role = $employee->user->getRoleNames()->first();

            $this->command->info("✓ Employee created: {$employee->code} - {$employee->first_name} {$employee->last_name} (user: {$credential}, role: {$role})");
        }

        // Create random employees without system users via factory
        $factoryCount = config('seeders.factory_counts.employees', 5);
        Employee::factory($factoryCount)->create();
        $this->command->info("✓ Created {$factoryCount} random employees (factory)");

        $this->command->info('✓ Development employees seeded successfully');
    }
}
