<?php

namespace Database\Seeders\Demo;

use App\Actions\Employee\CreateEmployeeAction;
use App\Models\Branch;
use App\Models\Employee;
use Database\Seeders\Base\OnceSeeder;

/**
 * Deterministic counterpart of Development\EmployeeSeeder for the Demo
 * (#635): the same config-defined staff (config/seeders.php →
 * development_employees), but with fixed, staggered hire dates instead of
 * random ones and without the factory-generated "baja" records, so every
 * reset yields the same roster.
 */
class DemoEmployeeSeeder extends OnceSeeder
{
    private const NEWEST_HIRE_DAYS_AGO = 90;

    private const HIRE_STAGGER_DAYS = 45;

    public function run(): void
    {
        $branch = Branch::orderBy('id')->first();

        if (! $branch) {
            $this->command->error('✗ No branch found. BranchSeeder must run before DemoEmployeeSeeder.');

            return;
        }

        $action = app(CreateEmployeeAction::class);

        foreach (array_values(config('seeders.development_employees', [])) as $index => $employeeData) {
            if (Employee::where('code', $employeeData['code'])->exists()) {
                continue;
            }

            $hireDate = now()->startOfDay()->subDays(self::NEWEST_HIRE_DAYS_AGO + $index * self::HIRE_STAGGER_DAYS);

            $employee = $action([
                ...$employeeData,
                'branch_id' => $branch->id,
                'start_date' => $hireDate->toDateString(),
            ]);

            $employee->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);
            $employee->employmentPeriods()->update(['created_at' => $hireDate, 'updated_at' => $hireDate]);

            $this->command->info("✓ Demo employee: {$employee->code} (hired {$hireDate->toDateString()})");
        }
    }
}
