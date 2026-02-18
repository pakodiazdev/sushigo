<?php

namespace Database\Seeders\Development;

use App\Actions\Employee\CreateEmployeeAction;
use App\Models\Employee;
use Database\Seeders\Base\OnceSeeder;

class EmployeeSeeder extends OnceSeeder
{
    /**
     * Seed development employees with users and roles.
     *
     * WithoutModelEvents is NOT used in DatabaseSeeder because HasPublicId
     * relies on the Eloquent 'creating' event to auto-generate ULIDs.
     *
     * CreateEmployeeAction triggers SendWelcomeNotificationAction which:
     * - Sends email via $user->notify() → caught by Mailhog in dev
     * - Logs the reset URL for easy testing without opening Mailhog
     * - Calls WhatsAppService → wrapped in try/catch, fails gracefully
     */
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
            $roles = implode(', ', $employee->getPositionRoles());

            $this->command->info("✓ Employee created: {$employee->code} - {$employee->first_name} {$employee->last_name} (user: {$credential}, roles: {$roles})");
        }

        // Create random employees with linked user accounts via factory
        $factoryCount = config('seeders.factory_counts.employees', 5);
        Employee::factory($factoryCount)->withUser()->create();
        $this->command->info("✓ Created {$factoryCount} random employees with users (factory)");

        $this->command->info('✓ Development employees seeded successfully');
    }
}
