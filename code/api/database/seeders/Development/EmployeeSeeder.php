<?php

namespace Database\Seeders\Development;

use App\Actions\Employee\CreateEmployeeAction;
use App\Models\Employee;
use Database\Seeders\Base\OnceSeeder;
use Illuminate\Support\Facades\Notification;

class EmployeeSeeder extends OnceSeeder
{
    /**
     * Seed development employees with users and roles.
     *
     * WithoutModelEvents is NOT used in DatabaseSeeder because HasPublicId
     * relies on the Eloquent 'creating' event to auto-generate ULIDs.
     *
     * Instead, Notification::fake() suppresses email/WhatsApp welcome
     * notifications during seeding. The WhatsApp service call (not a
     * Laravel Notification) is already wrapped in a try/catch inside
     * CreateEmployeeAction, so it fails gracefully regardless.
     */
    public function run(): void
    {
        // Suppress Laravel notifications during seeding to avoid sending
        // real emails. CreateEmployeeAction dispatches welcome notifications.
        Notification::fake();

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
            $roles = $employee->getRoleNames()->implode(', ');

            $this->command->info("✓ Employee created: {$employee->code} - {$employee->first_name} {$employee->last_name} (user: {$credential}, roles: {$roles})");
        }

        // Create random employees with linked user accounts via factory
        $factoryCount = config('seeders.factory_counts.employees', 5);
        Employee::factory($factoryCount)->withUser()->create();
        $this->command->info("✓ Created {$factoryCount} random employees with users (factory)");

        $this->command->info('✓ Development employees seeded successfully');
    }
}
