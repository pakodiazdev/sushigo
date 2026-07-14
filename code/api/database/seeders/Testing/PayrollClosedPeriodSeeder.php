<?php

namespace Database\Seeders\Testing;

use App\Exceptions\SeederPrerequisiteMissingException;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Closed pay period test seeder — for the "View Closed Period Detail" E2E spec.
 *
 * Builds on top of PayrollPreviewSeeder's PAY-001/PAY-002 employees: freezes a
 * CLOSED PayPeriod for week 2026-06-22..2026-06-28 with a totals row and a
 * BASE_PAY line per employee, closed by the CoreTestSeeder admin user.
 *
 * Requires PayrollPreviewSeeder to have run first in the same seeder group.
 */
class PayrollClosedPeriodSeeder extends Seeder
{
    private const PERIOD_START = '2026-06-22';

    private const PERIOD_END = '2026-06-28';

    public function run(): void
    {
        $now = now();
        $branchId = DB::table('branches')->where('code', 'MAIN')->value('id');
        if (! $branchId) {
            throw new SeederPrerequisiteMissingException('PayrollClosedPeriodSeeder: MAIN branch not found — run CoreTestSeeder first.');
        }

        $closedById = DB::table('users')->where('email', 'admin@sushigo.com')->value('id');
        if (! $closedById) {
            throw new SeederPrerequisiteMissingException('PayrollClosedPeriodSeeder: admin@sushigo.com user not found — run CoreTestSeeder first.');
        }

        $payPeriodId = DB::table('pay_periods')->insertGetId([
            'public_id' => Str::ulid()->toString(),
            'branch_id' => $branchId,
            'period_start' => self::PERIOD_START,
            'period_end' => self::PERIOD_END,
            'status' => 'CLOSED',
            'closed_by' => $closedById,
            'closed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $employees = DB::table('employees')->whereIn('code', ['PAY-001', 'PAY-002'])->get(['id']);
        if ($employees->count() !== 2) {
            throw new SeederPrerequisiteMissingException('PayrollClosedPeriodSeeder: expected PAY-001 and PAY-002 employees — run PayrollPreviewSeeder first.');
        }

        foreach ($employees as $employee) {
            $payPeriodEmployeeId = DB::table('pay_period_employees')->insertGetId([
                'public_id' => Str::ulid()->toString(),
                'pay_period_id' => $payPeriodId,
                'employee_id' => $employee->id,
                'base_pay' => 4000,
                'late_deductions' => 0,
                'unpaid_leave_deductions' => 0,
                'overtime_pay' => 0,
                'extra_day_pay' => 0,
                'punctuality_bonus' => 0,
                'holiday_pay' => 0,
                'other_adjustments' => 0,
                'total_pay' => 4000,
                'free_hours_earned' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('pay_period_lines')->insert([
                'public_id' => Str::ulid()->toString(),
                'pay_period_employee_id' => $payPeriodEmployeeId,
                'date' => self::PERIOD_START,
                'concept' => 'BASE_PAY',
                'description' => 'Día trabajado',
                'amount' => 4000,
                'minutes' => 480,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
