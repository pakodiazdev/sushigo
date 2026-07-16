<?php

namespace Database\Seeders\Testing;

use App\Exceptions\SeederPrerequisiteMissingException;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Pay period history test seeder — gives the "Pay Periods List" spec a couple of
 * months of history to page/scroll through, ending right before the week that
 * PayrollClosedPeriodSeeder freezes (2026-06-22..2026-06-28), so it never collides
 * with that seeder's specific week or its hardcoded totals.
 *
 * Each week is CLOSED with the same deterministic base_pay=4000/total_pay=4000 per
 * employee and a single BASE_PAY line, following PayrollClosedPeriodSeeder's own
 * simplified (no real attendance backing) style — this data exists to be listed
 * and browsed, not to be recomputed from attendance.
 *
 * Requires PayrollPreviewSeeder to have run first in the same seeder group.
 */
class PayrollPeriodHistorySeeder extends Seeder
{
    /** Sunday immediately before PayrollClosedPeriodSeeder's period_start (2026-06-22) */
    private const LATEST_HISTORICAL_SUNDAY = '2026-06-21';

    /** ~2 months of weekly history */
    private const WEEKS_OF_HISTORY = 8;

    private const BASE_PAY = 4000;

    public function run(): void
    {
        $now = now();
        $branchId = DB::table('branches')->where('code', 'MAIN')->value('id');
        if (! $branchId) {
            throw new SeederPrerequisiteMissingException('PayrollPeriodHistorySeeder: MAIN branch not found — run CoreTestSeeder first.');
        }

        $closedById = DB::table('users')->where('email', 'admin@sushigo.com')->value('id');
        if (! $closedById) {
            throw new SeederPrerequisiteMissingException('PayrollPeriodHistorySeeder: admin@sushigo.com user not found — run CoreTestSeeder first.');
        }

        $employees = DB::table('employees')->whereIn('code', ['PAY-001', 'PAY-002'])->get(['id']);
        if ($employees->count() !== 2) {
            throw new SeederPrerequisiteMissingException('PayrollPeriodHistorySeeder: expected PAY-001 and PAY-002 employees — run PayrollPreviewSeeder first.');
        }

        $periodEnd = Carbon::parse(self::LATEST_HISTORICAL_SUNDAY);

        for ($week = 0; $week < self::WEEKS_OF_HISTORY; $week++) {
            $weekEnd = $periodEnd->copy()->subWeeks($week);
            $weekStart = $weekEnd->copy()->subDays(6);

            $payPeriodId = DB::table('pay_periods')->insertGetId([
                'public_id' => Str::ulid()->toString(),
                'branch_id' => $branchId,
                'period_start' => $weekStart->toDateString(),
                'period_end' => $weekEnd->toDateString(),
                'status' => 'CLOSED',
                'closed_by' => $closedById,
                'closed_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($employees as $employee) {
                $payPeriodEmployeeId = DB::table('pay_period_employees')->insertGetId([
                    'public_id' => Str::ulid()->toString(),
                    'pay_period_id' => $payPeriodId,
                    'employee_id' => $employee->id,
                    'base_pay' => self::BASE_PAY,
                    'late_deductions' => 0,
                    'unpaid_leave_deductions' => 0,
                    'overtime_pay' => 0,
                    'extra_day_pay' => 0,
                    'punctuality_bonus' => 0,
                    'holiday_pay' => 0,
                    'other_adjustments' => 0,
                    'total_pay' => self::BASE_PAY,
                    'free_hours_earned' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                DB::table('pay_period_lines')->insert([
                    'public_id' => Str::ulid()->toString(),
                    'pay_period_employee_id' => $payPeriodEmployeeId,
                    'date' => $weekStart->toDateString(),
                    'concept' => 'BASE_PAY',
                    'description' => 'Día trabajado',
                    'amount' => self::BASE_PAY,
                    'minutes' => 480,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }
}
