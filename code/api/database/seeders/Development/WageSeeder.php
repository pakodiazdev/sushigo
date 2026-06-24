<?php

namespace Database\Seeders\Development;

use App\Models\Employee;
use App\Models\WageHistory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds hourly_rate and weekly_scheduled_hours for all active employees
 * so the payroll preview returns non-zero totals during local development.
 */
class WageSeeder extends Seeder
{
    private const HOURS_FULL = '48.00';

    private const HOURS_STANDARD = '40.00';

    private const DEFAULT_RATE = '80.00';

    private const DEFAULT_HOURS = self::HOURS_STANDARD;

    // Deterministic rates per employee code; factory employees fall back to default
    private const RATES = [
        'ADM-001' => ['hourly_rate' => '125.00', 'weekly_hours' => self::HOURS_FULL],
        'ADM-002' => ['hourly_rate' => '110.00', 'weekly_hours' => self::HOURS_FULL],
        'EMP-001' => ['hourly_rate' => '95.00',  'weekly_hours' => self::HOURS_FULL],
        'EMP-002' => ['hourly_rate' => '80.00',  'weekly_hours' => self::HOURS_STANDARD],
        'EMP-003' => ['hourly_rate' => '75.00',  'weekly_hours' => self::HOURS_STANDARD],
        'EMP-004' => ['hourly_rate' => '78.00',  'weekly_hours' => self::HOURS_STANDARD],
        'EMP-005' => ['hourly_rate' => '85.00',  'weekly_hours' => self::HOURS_FULL],
        'EMP-006' => ['hourly_rate' => '82.00',  'weekly_hours' => self::HOURS_FULL],
        'EMP-007' => ['hourly_rate' => '76.00',  'weekly_hours' => self::HOURS_STANDARD],
        'EMP-008' => ['hourly_rate' => '79.00',  'weekly_hours' => self::HOURS_STANDARD],
    ];

    public function run(): void
    {
        $employees = Employee::where('is_active', true)
            ->whereHas('employmentPeriods', fn ($q) => $q->where('is_active', true))
            ->with(['employmentPeriods' => fn ($q) => $q->where('is_active', true)])
            ->get();

        $created = 0;
        $skipped = 0;

        foreach ($employees as $employee) {
            $existing = WageHistory::where('employee_id', $employee->id)
                ->whereNull('effective_to')
                ->first();

            if ($existing) {
                $skipped++;

                continue;
            }

            $rate = self::RATES[$employee->code] ?? null;
            $start = $employee->employmentPeriods->first()?->start_date ?? now()->toDateString();

            WageHistory::create([
                'public_id' => Str::ulid()->toString(),
                'employee_id' => $employee->id,
                'hourly_rate' => $rate['hourly_rate'] ?? self::DEFAULT_RATE,
                'weekly_scheduled_hours' => $rate['weekly_hours'] ?? self::DEFAULT_HOURS,
                'effective_from' => $start,
                'effective_to' => null,
            ]);

            $created++;
        }

        $this->command->info("✓ WageSeeder: {$created} wages created, {$skipped} skipped (already had wage)");
    }
}
