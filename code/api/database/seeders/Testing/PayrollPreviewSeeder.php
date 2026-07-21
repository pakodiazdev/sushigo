<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Payroll preview test seeder.
 *
 * Creates 2 employees with attendance records for week 2026-06-22..2026-06-28
 * so the payroll preview E2E spec can verify the table renders correctly.
 *
 * Always starts from truncated attendance/employee tables (CoreTestSeeder ran first).
 */
class PayrollPreviewSeeder extends Seeder
{
    private const HOURLY_RATE = '100.00';

    private const WEEKLY_HOURS = '48.00';

    private const EMPLOYEE_START_DATE = '2025-01-01';

    private const EPOCH_DATE = '1970-01-01 ';

    // Mon–Fri schedule: 08:00–17:00, lunch 13:00–14:00 → 8h net = 480 min
    private const SHIFT_START = '08:00:00';

    private const SHIFT_END = '17:00:00';

    private const LUNCH_START = '13:00:00';

    private const LUNCH_END = '14:00:00';

    private const LUNCH_MINUTES = 60;

    /** Mon–Fri of week 2026-06-22..2026-06-28 */
    private const WORKED_DATES = [
        '2026-06-22', // Mon
        '2026-06-23', // Tue
        '2026-06-24', // Wed
        '2026-06-25', // Thu
        '2026-06-26', // Fri
    ];

    public function run(): void
    {
        $now = now();
        $branchId = DB::table('branches')->where('code', 'MAIN')->value('id');
        $roleMap = DB::table('roles')->where('guard_name', 'api')->pluck('id', 'name')->toArray();
        $hashedPassword = Hash::make(config('seeders.passwords.employee'));

        $employees = [
            ['code' => 'PAY-001', 'first_name' => 'Ana',    'last_name' => 'Payroll',   'email' => 'pay001@sushigo.com'],
            ['code' => 'PAY-002', 'first_name' => 'Carlos', 'last_name' => 'Nomina',    'email' => 'pay002@sushigo.com'],
        ];

        foreach ($employees as $emp) {
            $userId = DB::table('users')->insertGetId([
                'first_name' => $emp['first_name'],
                'last_name' => $emp['last_name'],
                'email' => $emp['email'],
                'password' => $hashedPassword,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('model_has_roles')->insert([
                'role_id' => $roleMap['cook'] ?? 1,
                'model_type' => 'App\\Models\\User',
                'model_id' => $userId,
            ]);

            $employeeId = DB::table('employees')->insertGetId([
                'public_id' => Str::ulid()->toString(),
                'user_id' => $userId,
                'code' => $emp['code'],
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $periodId = DB::table('employment_periods')->insertGetId([
                'public_id' => Str::ulid()->toString(),
                'employee_id' => $employeeId,
                'branch_id' => $branchId,
                'start_date' => self::EMPLOYEE_START_DATE,
                'end_date' => null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $scheduleId = DB::table('employee_schedules')->insertGetId([
                'public_id' => Str::ulid()->toString(),
                'employment_period_id' => $periodId,
                'effective_from' => self::EMPLOYEE_START_DATE,
                'effective_to' => null,
                'workday_type' => 'FULL',
                'working_days_per_week' => 5,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Mon–Fri working days
            foreach (range(1, 5) as $dayOfWeek) {
                DB::table('schedule_days')->insert([
                    'employee_schedule_id' => $scheduleId,
                    'day_of_week' => $dayOfWeek,
                    'is_day_off' => false,
                    'expected_start' => self::EPOCH_DATE.self::SHIFT_START,
                    'expected_lunch_start' => self::EPOCH_DATE.self::LUNCH_START,
                    'expected_lunch_end' => self::EPOCH_DATE.self::LUNCH_END,
                    'lunch_duration_minutes' => self::LUNCH_MINUTES,
                    'expected_end' => self::EPOCH_DATE.self::SHIFT_END,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // Sat & Sun rest
            foreach ([6, 7] as $dayOfWeek) {
                DB::table('schedule_days')->insert([
                    'employee_schedule_id' => $scheduleId,
                    'day_of_week' => $dayOfWeek,
                    'is_day_off' => true,
                    'expected_start' => null,
                    'expected_lunch_start' => null,
                    'expected_lunch_end' => null,
                    'lunch_duration_minutes' => null,
                    'expected_end' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            DB::table('wage_histories')->insert([
                'public_id' => Str::ulid()->toString(),
                'employee_id' => $employeeId,
                'hourly_rate' => self::HOURLY_RATE,
                'weekly_scheduled_hours' => self::WEEKLY_HOURS,
                'effective_from' => self::EMPLOYEE_START_DATE,
                'effective_to' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach (self::WORKED_DATES as $date) {
                DB::table('attendances')->insert([
                    'public_id' => Str::ulid()->toString(),
                    'employee_id' => $employeeId,
                    'date' => $date,
                    'check_in' => $date.' '.self::SHIFT_START,
                    'check_out' => $date.' '.self::SHIFT_END,
                    'lunch_start' => $date.' '.self::LUNCH_START,
                    'lunch_end' => $date.' '.self::LUNCH_END,
                    'entry_late_seconds' => 0,
                    'lunch_late_seconds' => 0,
                    'net_worked_minutes' => 480,
                    'overtime_minutes' => 0,
                    'overtime_authorized' => false,
                    'day_status' => 'WORKED',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }
}
