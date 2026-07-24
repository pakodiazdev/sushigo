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

    private const TERMINATION_REASON_VOLUNTARY = 'Renuncia voluntaria';

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
            if (isset($employeeData['role']) && ! isset($employeeData['roles'])) {
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

            $this->command->info("✓ Employee created: {$employee->code} - {$employee->user->name} (hired: {$hireDate->toDateString()}, user: {$credential}, roles: {$roles})");
        }
    }

    /**
     * Scenario: Employee with 2 employment periods (re-entries), currently NOT active.
     * Both periods are closed — the employee resigned twice.
     */
    private function seedDosReingresos(CreateEmployeeAction $action, Branch $branch): void
    {
        $code = 'EMP-RE2';

        $result = $this->seedFirstReingresoHire($action, $branch, [
            'code' => $code,
            'first_name' => 'Luis',
            'last_name' => 'Dos Reingresos',
            'roles' => ['cook'],
            'email' => 'luis.reingresos2@sushigo.com',
            'phone' => '5512349902',
        ], 30, 20, self::TERMINATION_REASON_VOLUNTARY);

        if ($result === null) {
            return;
        }

        [$employee, $firstHire] = $result;

        // Second hire: ~10 months ago, closed ~4 months ago
        $secondHire = now()->subMonths(10)->startOfDay();
        $secondEnd = now()->subMonths(4)->startOfDay();

        $this->addClosedEmploymentPeriod($employee, $branch, $secondHire, $secondEnd, self::TERMINATION_REASON_VOLUNTARY);

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

        $result = $this->seedFirstReingresoHire($action, $branch, [
            'code' => $code,
            'first_name' => 'Sofía',
            'last_name' => 'Reingreso Tres',
            'roles' => ['kitchen-assistant'],
            'email' => 'sofia.reingresos3@sushigo.com',
            'phone' => '5512349903',
        ], 34, 26, 'Motivos personales');

        if ($result === null) {
            return;
        }

        [$employee, $firstHire] = $result;

        // Second hire: ~18 months ago, closed ~10 months ago
        $secondHire = now()->subMonths(18)->startOfDay();
        $secondEnd = now()->subMonths(10)->startOfDay();

        $this->addClosedEmploymentPeriod($employee, $branch, $secondHire, $secondEnd, 'Cambio de ciudad');

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
            $hireDate = $this->randomDateBetween(now()->subYears(2), now()->subMonths(6));
            $bajaDate = $this->randomDateBetween($hireDate->copy()->addMonths(1), now()->subMonths(1));

            $employee = Employee::factory()->cook()->inactive()->create();

            EmploymentPeriod::factory()->create([
                'employee_id' => $employee->id,
                'branch_id' => $branch->id,
                'start_date' => $hireDate->toDateString(),
                'end_date' => $bajaDate->toDateString(),
                'termination_reason' => fake()->randomElement([
                    self::TERMINATION_REASON_VOLUNTARY,
                    'Término de contrato',
                    'Despido justificado',
                    'Mutuo acuerdo',
                ]),
                'is_active' => false,
                'created_at' => $hireDate,
                'updated_at' => $bajaDate,
            ]);

            // Align employee and user timestamps
            $employee->update([
                'is_active' => false,
                'created_at' => $hireDate,
                'updated_at' => $bajaDate,
            ]);
            $employee->user?->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);
        }

        $this->command->info("✓ Created {$bajaCount} terminated employees (baja, no active period)");
    }

    /**
     * Create a re-entry employee's first employment period via the action.
     * Shared by seedDosReingresos/seedReingresoTres — only the literal
     * fields in $employeeData (name, roles, contact info) differ between scenarios.
     *
     * @param  array<string, mixed>  $employeeData  code/first_name/last_name/roles/email/phone
     */
    private function createReingresoEmployee(CreateEmployeeAction $action, Branch $branch, array $employeeData, Carbon $firstHire): Employee
    {
        return $action([
            ...$employeeData,
            'password' => config('seeders.passwords.employee'),
            'branch_id' => $branch->id,
            'start_date' => $firstHire->toDateString(),
        ]);
    }

    /**
     * Shared "first hire" setup for the reingreso scenarios: skip if the
     * employee already exists, compute first-hire/first-end dates from
     * months-ago offsets, create the employee, and close its first period.
     *
     * @param  array<string, mixed>  $employeeData  code/first_name/last_name/roles/email/phone
     * @return array{0: Employee, 1: Carbon}|null [employee, firstHire], or null if already seeded
     */
    private function seedFirstReingresoHire(
        CreateEmployeeAction $action,
        Branch $branch,
        array $employeeData,
        int $firstHireMonthsAgo,
        int $firstEndMonthsAgo,
        string $terminationReason
    ): ?array {
        if (Employee::where('code', $employeeData['code'])->exists()) {
            $this->command->info("⏭ Employee {$employeeData['code']} ({$employeeData['last_name']}) already exists, skipping");

            return null;
        }

        $firstHire = now()->subMonths($firstHireMonthsAgo)->startOfDay();
        $firstEnd = now()->subMonths($firstEndMonthsAgo)->startOfDay();

        $employee = $this->createReingresoEmployee($action, $branch, $employeeData, $firstHire);

        $this->closeFirstEmploymentPeriod($employee, $firstHire, $firstEnd, $terminationReason);

        return [$employee, $firstHire];
    }

    /**
     * Close the employment period created alongside the employee
     * (the "first hire" period in a re-entry scenario).
     */
    private function closeFirstEmploymentPeriod(Employee $employee, Carbon $firstHire, Carbon $firstEnd, string $terminationReason): void
    {
        $firstPeriod = $employee->employmentPeriods()->first();
        $firstPeriod->update([
            'end_date' => $firstEnd->toDateString(),
            'termination_reason' => $terminationReason,
            'is_active' => false,
            'created_at' => $firstHire,
            'updated_at' => $firstEnd,
        ]);
    }

    /**
     * Add a subsequent, already-closed employment period to a re-entry employee.
     */
    private function addClosedEmploymentPeriod(Employee $employee, Branch $branch, Carbon $start, Carbon $end, string $terminationReason): void
    {
        $employee->employmentPeriods()->create([
            'branch_id' => $branch->id,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'termination_reason' => $terminationReason,
            'is_active' => false,
            'created_at' => $start,
            'updated_at' => $end,
        ]);
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

        return $from->copy()->addDays(random_int(0, $days));
    }
}
