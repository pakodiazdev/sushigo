<?php

namespace Database\Seeders\Fakes;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use Illuminate\Database\Seeder;

/**
 * Generate N random employees via factories for volume testing.
 *
 * Useful for testing pagination, list views, and search with many records.
 * Depends on CoreTestSeeder data (branch, roles must exist).
 *
 * Count is read from config/seeders.php → factory_counts.employees (default: 5).
 *
 * @see doc/conventions/testing/test-data-seeders.md (Fakes category)
 */
class FakeEmployeesSeeder extends Seeder
{
    public function run(): void
    {
        $count = config('seeders.factory_counts.employees', 5);
        $branch = Branch::where('code', 'MAIN')->first();

        if (! $branch) {
            $this->command?->error('✗ No branch found. Run CoreTestSeeder first.');

            return;
        }

        $employees = Employee::factory($count)->withUser()->create();

        foreach ($employees as $employee) {
            EmploymentPeriod::factory()->create([
                'employee_id' => $employee->id,
                'branch_id' => $branch->id,
                'start_date' => now()->subMonths(random_int(1, 24))->toDateString(),
                'is_active' => true,
            ]);
        }

        $this->command?->info("✓ Created {$count} fake employees with users and employment periods");
    }
}
