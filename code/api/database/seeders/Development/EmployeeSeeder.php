<?php

namespace Database\Seeders\Development;

use App\Actions\Employee\CreateEmployeeAction;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use Carbon\Carbon;
use Database\Seeders\Base\OnceSeeder;

class EmployeeSeeder extends OnceSeeder
{
    /**
     * Backward compatibility: map legacy uppercase role names to new position roles.
     */
    private const LEGACY_ROLE_MAP = [
        'MANAGER' => 'manager',
        'COOK' => 'cook',
        'KITCHEN_ASSISTANT' => 'kitchen-assistant',
        'DELIVERY_DRIVER' => 'delivery-driver',
        'ACTING_MANAGER' => 'acting-manager',
    ];

    /**
     * Note: CreateEmployeeAction sends welcome notifications. In development
     * these are caught by Mailhog (MAIL_MAILER=smtp → localhost:1025).
     * Model events (Spatie permission cache) fire normally since
     * WithoutModelEvents was intentionally removed from DatabaseSeeder.
     */
    public function run(): void
    {
        $action = app(CreateEmployeeAction::class);

        // Always use the first (and currently only) branch
        $branch = Branch::first();

        if (! $branch) {
            $this->command->error('✗ No branch found. Make sure BranchSeeder runs before EmployeeSeeder.');

            return;
        }

        $this->seedConfigEmployees($action, $branch);
        $this->seedFactoryEmployees($branch);
        $this->seedFactoryBaja($branch);
        $this->seedDosReingresos($action, $branch);
        $this->seedReingresoTres($action, $branch);

        $this->command->info('✓ Development employees seeded successfully');
    }

    /**
     * Create employees defined in config/seeders.php with a random
     * creation date between 3 years ago and today.
     */
    private function seedConfigEmployees(CreateEmployeeAction $action, Branch $branch): void
    {
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
                $employeeData['roles'] = [self::LEGACY_ROLE_MAP[$legacyRole] ?? 'cook'];
                unset($employeeData['role']);
            }

            // Random hire date between 3 years ago and today
            $hireDate = $this->randomDateBetween(now()->subYears(3), now());

            // Inject branch_id and start_date required by CreateEmployeeAction
            $employeeData['branch_id'] = $branch->id;
            $employeeData['start_date'] = $hireDate->toDateString();

            $employee = $action($employeeData);

            // Update timestamps to match the hire date for realism
            $employee->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);
            $employee->employmentPeriods()->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);
            $employee->user->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);

            $credential = $employee->user->email ?? $employee->user->phone ?? 'N/A';
            $roles = implode(', ', $employee->getPositionRoles());

            $this->command->info("✓ Employee created: {$employee->code} - {$employee->first_name} {$employee->last_name} (hired: {$hireDate->toDateString()}, user: {$credential}, roles: {$roles})");
        }
    }

    /**
     * Create random employees with linked user accounts via factory
     * and assign them to the main branch with an employment period.
     */
    private function seedFactoryEmployees(Branch $branch): void
    {
        $factoryCount = config('seeders.factory_counts.employees', 5);
        $factoryEmployees = Employee::factory($factoryCount)->withUser()->create();

        foreach ($factoryEmployees as $employee) {
            $hireDate = $this->randomDateBetween(now()->subYears(3), now());

            $period = EmploymentPeriod::factory()->create([
                'employee_id' => $employee->id,
                'branch_id' => $branch->id,
                'start_date' => $hireDate->toDateString(),
                'is_active' => true,
            ]);

            // Align all timestamps to the hire date
            $employee->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);
            $period->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);
            $employee->user?->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);
        }

        $this->command->info("✓ Created {$factoryCount} random employees with users (factory) assigned to branch: {$branch->name}");
    }

    /**
     * Scenario: Employee with 2 employment periods (re-entries), currently NOT active.
     * Both periods are closed — the employee resigned twice.
     */
    private function seedDosReingresos(CreateEmployeeAction $action, Branch $branch): void
    {
        $code = 'EMP-RE2';

        if (Employee::where('code', $code)->exists()) {
            $this->command->info("⏭ Employee {$code} (Dos Reingresos) already exists, skipping");
            return;
        }

        // First hire: ~2.5 years ago
        $firstHire = now()->subMonths(30)->startOfDay();
        $firstEnd = now()->subMonths(20)->startOfDay();

        $employee = $action([
            'code' => $code,
            'first_name' => 'Luis',
            'last_name' => 'Dos Reingresos',
            'roles' => ['cook'],
            'email' => 'luis.reingresos2@sushigo.com',
            'phone' => '5512349902',
            'password' => 'employee123456',
            'branch_id' => $branch->id,
            'start_date' => $firstHire->toDateString(),
        ]);

        // Close the first period (created by the action)
        $firstPeriod = $employee->employmentPeriods()->first();
        $firstPeriod->update([
            'end_date' => $firstEnd->toDateString(),
            'termination_reason' => 'Renuncia voluntaria',
            'is_active' => false,
            'created_at' => $firstHire,
            'updated_at' => $firstEnd,
        ]);

        // Second hire: ~10 months ago, closed ~4 months ago
        $secondHire = now()->subMonths(10)->startOfDay();
        $secondEnd = now()->subMonths(4)->startOfDay();

        $employee->employmentPeriods()->create([
            'branch_id' => $branch->id,
            'start_date' => $secondHire->toDateString(),
            'end_date' => $secondEnd->toDateString(),
            'termination_reason' => 'Renuncia voluntaria',
            'is_active' => false,
            'created_at' => $secondHire,
            'updated_at' => $secondEnd,
        ]);

        // Mark employee as inactive
        $employee->update([
            'is_active' => false,
            'created_at' => $firstHire,
            'updated_at' => $secondEnd,
        ]);
        $employee->user->update(['created_at' => $firstHire, 'updated_at' => $firstHire]);

        $this->command->info("✓ Employee created: {$code} - Luis Dos Reingresos (2 periods, NOT active)");
    }

    /**
     * Scenario: Employee with 3 employment periods (re-entries), currently ACTIVE.
     * First two periods are closed, the third (latest) is still active.
     */
    private function seedReingresoTres(CreateEmployeeAction $action, Branch $branch): void
    {
        $code = 'EMP-RE3';

        if (Employee::where('code', $code)->exists()) {
            $this->command->info("⏭ Employee {$code} (Reingreso Tres) already exists, skipping");
            return;
        }

        // First hire: ~3 years ago
        $firstHire = now()->subMonths(34)->startOfDay();
        $firstEnd = now()->subMonths(26)->startOfDay();

        $employee = $action([
            'code' => $code,
            'first_name' => 'Sofía',
            'last_name' => 'Reingreso Tres',
            'roles' => ['kitchen-assistant'],
            'email' => 'sofia.reingresos3@sushigo.com',
            'phone' => '5512349903',
            'password' => 'employee123456',
            'branch_id' => $branch->id,
            'start_date' => $firstHire->toDateString(),
        ]);

        // Close the first period (created by the action)
        $firstPeriod = $employee->employmentPeriods()->first();
        $firstPeriod->update([
            'end_date' => $firstEnd->toDateString(),
            'termination_reason' => 'Motivos personales',
            'is_active' => false,
            'created_at' => $firstHire,
            'updated_at' => $firstEnd,
        ]);

        // Second hire: ~18 months ago, closed ~10 months ago
        $secondHire = now()->subMonths(18)->startOfDay();
        $secondEnd = now()->subMonths(10)->startOfDay();

        $employee->employmentPeriods()->create([
            'branch_id' => $branch->id,
            'start_date' => $secondHire->toDateString(),
            'end_date' => $secondEnd->toDateString(),
            'termination_reason' => 'Cambio de ciudad',
            'is_active' => false,
            'created_at' => $secondHire,
            'updated_at' => $secondEnd,
        ]);

        // Third hire (current): ~3 months ago, still active
        $thirdHire = now()->subMonths(3)->startOfDay();

        $employee->employmentPeriods()->create([
            'branch_id' => $branch->id,
            'start_date' => $thirdHire->toDateString(),
            'is_active' => true,
            'created_at' => $thirdHire,
            'updated_at' => $thirdHire,
        ]);

        // Employee is active (last period is active)
        $employee->update([
            'is_active' => true,
            'created_at' => $firstHire,
            'updated_at' => $thirdHire,
        ]);
        $employee->user->update(['created_at' => $firstHire, 'updated_at' => $firstHire]);

        $this->command->info("✓ Employee created: {$code} - Sofía Reingreso Tres (3 periods, ACTIVE)");
    }

    /**
     * Scenario: 2 factory employees that are "bajas" (terminated + inactive).
     * Each has one closed employment period and is_active = false.
     * Useful for testing list filters and status views.
     */
    private function seedFactoryBaja(Branch $branch): void
    {
        $bajaCount = 2;

        for ($i = 0; $i < $bajaCount; $i++) {
            $hireDate   = $this->randomDateBetween(now()->subYears(2), now()->subMonths(6));
            $bajaDate   = $this->randomDateBetween($hireDate->copy()->addMonths(1), now()->subMonths(1));

            $employee = Employee::factory()->cook()->inactive()->create();

            EmploymentPeriod::factory()->create([
                'employee_id'        => $employee->id,
                'branch_id'          => $branch->id,
                'start_date'         => $hireDate->toDateString(),
                'end_date'           => $bajaDate->toDateString(),
                'termination_reason' => fake()->randomElement([
                    'Renuncia voluntaria',
                    'Término de contrato',
                    'Despido justificado',
                    'Mutuo acuerdo',
                ]),
                'is_active'          => false,
                'created_at'         => $hireDate,
                'updated_at'         => $bajaDate,
            ]);

            // Align employee and user timestamps
            $employee->update([
                'is_active'  => false,
                'created_at' => $hireDate,
                'updated_at' => $bajaDate,
            ]);
            $employee->user?->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);
        }

        $this->command->info("✓ Created {$bajaCount} terminated employees (baja, no active period)");
    }

    /**
     * Generate a random Carbon date between two dates.
     */
    private function randomDateBetween(Carbon $from, Carbon $to): Carbon
    {
        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        $days = $from->diffInDays($to);

        return $from->copy()->addDays(rand(0, $days));
    }
}
