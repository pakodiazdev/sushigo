<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * "Ausentes" without an Attendance record seeder — covers issue #358:
 * an employee on approved vacation or a scheduled rest day must show under
 * "Ausentes" even before any Attendance row exists for today.
 *
 *   EMP-007  → approved VacationRequest covering today, NO Attendance record
 *   EMP-008  → schedule marks today (Thursday) as a rest day, NO Attendance record
 *
 * Used by the attendance-absent-no-record Cypress spec via:
 *   cy.task('test:reset', 'attendance-absent-no-record')
 *
 * Employees and their base (Mon-Sat) schedule must already exist
 * (AttendanceTestSeeder ran first).
 */
class AttendanceAbsentNoRecordSeeder extends Seeder
{
    // Matches the X-Test-Time the Cypress spec sends — same Thursday used by
    // the other attendance-today specs.
    private const TEST_DATE = '2026-04-09';

    private const TEST_DAY_OF_WEEK = 4; // ISO Thursday

    public function run(): void
    {
        $now = now();

        $employeeIdMap = DB::table('employees')
            ->whereIn('code', ['EMP-007', 'EMP-008'])
            ->pluck('id', 'code')
            ->toArray();

        $this->seedApprovedVacation($employeeIdMap['EMP-007'], $now);
        $this->markTodayAsScheduledRestDay($employeeIdMap['EMP-008']);
    }

    private function seedApprovedVacation(int $employeeId, mixed $now): void
    {
        $adminUserId = DB::table('users')->where('email', 'admin@sushigo.com')->value('id');

        $entitlementId = DB::table('vacation_entitlements')->insertGetId([
            'employee_id' => $employeeId,
            'year' => (int) date('Y', strtotime(self::TEST_DATE)),
            'entitled_days' => 12,
            'used_days' => 1,
            'rule_key' => 'TEST',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $vacationRequestId = DB::table('vacation_requests')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'employee_id' => $employeeId,
            'vacation_entitlement_id' => $entitlementId,
            'start_date' => self::TEST_DATE,
            'end_date' => self::TEST_DATE,
            'days_count' => 1,
            'status' => 'APPROVED',
            'requested_by' => $adminUserId,
            'approved_by' => $adminUserId,
            'approved_at' => $now,
            'notes' => 'Vacaciones aprobadas (test) — sin registro de asistencia aún',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('vacation_request_dates')->insert([
            'vacation_request_id' => $vacationRequestId,
            'date' => self::TEST_DATE,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * Overrides the employee's own weekly schedule so Thursday (the Cypress
     * spec's test date) is a rest day, without touching any Attendance row.
     */
    private function markTodayAsScheduledRestDay(int $employeeId): void
    {
        $scheduleId = DB::table('employee_schedules')
            ->join('employment_periods', 'employment_periods.id', '=', 'employee_schedules.employment_period_id')
            ->where('employment_periods.employee_id', $employeeId)
            ->value('employee_schedules.id');

        DB::table('schedule_days')
            ->where('employee_schedule_id', $scheduleId)
            ->where('day_of_week', self::TEST_DAY_OF_WEEK)
            ->update([
                'is_day_off' => true,
                'expected_start' => null,
                'expected_lunch_start' => null,
                'expected_lunch_end' => null,
                'expected_end' => null,
                'lunch_duration_minutes' => null,
            ]);
    }
}
