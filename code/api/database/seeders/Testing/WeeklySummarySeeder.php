<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Weekly summary seeder — one full week of attendance for EMP-001.
 *
 * Period: 2026-06-16 (Mon) to 2026-06-22 (Sun)
 * Schedule from AttendanceTestSeeder: 13:00-22:00 Mon-Sat, lunch 15:00-15:30
 *
 * Attendance map:
 *   2026-06-16 Mon — WORKED, entry 60 min late (entry_late_seconds = 3600, deductible)
 *   2026-06-17 Tue — WORKED, on time
 *   2026-06-18 Wed — WORKED, on time
 *   2026-06-19 Thu — WORKED, on time
 *   2026-06-20 Fri — WORKED, on time
 *   2026-06-21 Sat — WORKED, on time
 *   2026-06-22 Sun — DAY_OFF
 *
 * Expected payroll (AttendanceTestSeeder wages: 40.00/h, 54h/week, 6 working days):
 *   daily_rate          = 40 × (54/6)   = 360.00
 *   rest_day_portion    = 360 / 6       = 60.00
 *   base_pay            = 6 × (360+60)  = 2520.00
 *   late_deductions     = 60 × (40/60)  = 40.00  (1 day × 60 min × minuteRate)
 *   punctuality_bonus   = 0.00          (no EmployeeBonusConfig seeded)
 *   total_pay           = 2480.00
 *
 * Used by the attendance-weekly-summary Cypress spec via:
 *   cy.task('test:reset', 'weekly-summary')
 *
 * Requires: CoreTestSeeder + AttendanceTestSeeder ran first.
 */
class WeeklySummarySeeder extends Seeder
{
    // 14:00 CDMX (UTC-6) = 20:00 UTC — exactly 1h late on Jun 16 (shift starts 13:00 CDMX = 19:00 UTC)
    private const LATE_CHECKIN_UTC = '2026-06-16 20:00:00';

    private const ON_TIME_CHECKIN = '19:00:00'; // 13:00 CDMX

    private const CHECKOUT_UTC = '04:00:00';    // 22:00 CDMX next day UTC

    private const LUNCH_START = '21:00:00';     // 15:00 CDMX

    private const LUNCH_END = '21:30:00';       // 15:30 CDMX

    public function run(): void
    {
        $now = now();

        $employeeId = DB::table('employees')->where('code', 'EMP-001')->value('id');

        $this->seedAttendances($employeeId, $now);
    }

    private function seedAttendances(int $employeeId, mixed $now): void
    {
        $days = [
            // Mon — 60 min late
            [
                'date' => '2026-06-16',
                'check_in' => self::LATE_CHECKIN_UTC,
                'check_out' => '2026-06-17 '.self::CHECKOUT_UTC,
                'entry_late_seconds' => 3600,
                'day_status' => 'WORKED',
            ],
            // Tue-Sat — on time
            ['date' => '2026-06-17', 'check_in' => '2026-06-17 '.self::ON_TIME_CHECKIN, 'check_out' => '2026-06-18 '.self::CHECKOUT_UTC, 'entry_late_seconds' => 0, 'day_status' => 'WORKED'],
            ['date' => '2026-06-18', 'check_in' => '2026-06-18 '.self::ON_TIME_CHECKIN, 'check_out' => '2026-06-19 '.self::CHECKOUT_UTC, 'entry_late_seconds' => 0, 'day_status' => 'WORKED'],
            ['date' => '2026-06-19', 'check_in' => '2026-06-19 '.self::ON_TIME_CHECKIN, 'check_out' => '2026-06-20 '.self::CHECKOUT_UTC, 'entry_late_seconds' => 0, 'day_status' => 'WORKED'],
            ['date' => '2026-06-20', 'check_in' => '2026-06-20 '.self::ON_TIME_CHECKIN, 'check_out' => '2026-06-21 '.self::CHECKOUT_UTC, 'entry_late_seconds' => 0, 'day_status' => 'WORKED'],
            ['date' => '2026-06-21', 'check_in' => '2026-06-21 '.self::ON_TIME_CHECKIN, 'check_out' => '2026-06-22 '.self::CHECKOUT_UTC, 'entry_late_seconds' => 0, 'day_status' => 'WORKED'],
            // Sun — DAY_OFF
            ['date' => '2026-06-22', 'check_in' => null, 'check_out' => null, 'entry_late_seconds' => 0, 'day_status' => 'DAY_OFF'],
        ];

        $rows = [];

        foreach ($days as $day) {
            $lunchStart = ($day['day_status'] === 'WORKED' && $day['check_in'])
                ? substr($day['date'], 0, 10).' '.self::LUNCH_START
                : null;
            $lunchEnd = ($day['day_status'] === 'WORKED' && $day['check_in'])
                ? substr($day['date'], 0, 10).' '.self::LUNCH_END
                : null;

            $rows[] = [
                'employee_id' => $employeeId,
                'date' => $day['date'],
                'check_in' => $day['check_in'],
                'check_out' => $day['check_out'],
                'lunch_start' => $lunchStart,
                'lunch_end' => $lunchEnd,
                'entry_late_seconds' => $day['entry_late_seconds'],
                'lunch_late_seconds' => 0,
                'net_worked_minutes' => null,
                'overtime_minutes' => 0,
                'overtime_authorized' => false,
                'overtime_authorized_by' => null,
                'overtime_authorized_at' => null,
                'day_status' => $day['day_status'],
                'confirmed_by' => null,
                'meta' => null,
                'public_id' => (string) Str::ulid(),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('attendances')->insert($rows);
    }
}
