<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Today-report status seeder — one employee per operational status.
 *
 * Test date: 2026-06-18 (Thursday, ISO DOW = 4)
 * Times stored in UTC (CDMX = UTC-6, so 13:00 CDMX = 19:00 UTC)
 *
 * Employee → status mapping:
 *   EMP-001  Carlos Mendoza   → arrived      (check-in 13:00 CDMX, on time)
 *   EMP-002  María García     → late         (check-in 13:15 CDMX, +15 min)
 *   EMP-003  Pedro López      → not_arrived  (no attendance, Thursday = work day)
 *   EMP-004  Ana Ramírez      → on_leave     (approved full-day leave)
 *   EMP-005  Roberto Sánchez  → day_off      (attendance record with DAY_OFF status)
 *   EMP-006  Laura Torres     → rest_day     (Thursday marked is_day_off on schedule)
 *   EMP-007, EMP-008          → not_arrived  (no data seeded — incidental)
 *
 * Used by the attendance-today-report-statuses Cypress spec via:
 *   cy.task('test:reset', 'today-report-statuses')
 *
 * Requires: CoreTestSeeder + AttendanceTestSeeder ran first.
 */
class TodayReportStatusSeeder extends Seeder
{
    private const TEST_DATE = '2026-06-18';

    // 13:00 CDMX (UTC-6) = 19:00:00 UTC
    private const CHECK_IN_ON_TIME_UTC = '2026-06-18 19:00:00';

    // 13:15 CDMX = 19:15:00 UTC  (entry_late_seconds = 900)
    private const CHECK_IN_LATE_UTC = '2026-06-18 19:15:00';

    // Thursday = ISO day of week 4
    private const DOW_THURSDAY = 4;

    public function run(): void
    {
        $now = now();

        $employeeIdMap = DB::table('employees')
            ->whereIn('code', ['EMP-001', 'EMP-002', 'EMP-004', 'EMP-005', 'EMP-006'])
            ->pluck('id', 'code')
            ->toArray();

        $adminUserId = DB::table('users')->where('email', 'admin@sushigo.com')->value('id');

        $leaveTypeId = DB::table('leave_types')
            ->where('code', 'PERMISSION')
            ->value('id');

        $this->seedAttendances($employeeIdMap, $now);
        $this->seedLeave($employeeIdMap['EMP-004'], $leaveTypeId, $adminUserId, $now);
        $this->markThursdayAsRestDay($employeeIdMap['EMP-006']);
    }

    private function seedAttendances(array $employeeIdMap, mixed $now): void
    {
        DB::table('attendances')->insert([
            // EMP-001 — arrived on time
            [
                'employee_id' => $employeeIdMap['EMP-001'],
                'date' => self::TEST_DATE,
                'check_in' => self::CHECK_IN_ON_TIME_UTC,
                'check_out' => null,
                'lunch_start' => null,
                'lunch_end' => null,
                'entry_late_seconds' => 0,
                'lunch_late_seconds' => 0,
                'net_worked_minutes' => null,
                'overtime_minutes' => 0,
                'overtime_authorized' => false,
                'overtime_authorized_by' => null,
                'overtime_authorized_at' => null,
                'day_status' => 'WORKED',
                'confirmed_by' => null,
                'meta' => null,
                'public_id' => (string) Str::ulid(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // EMP-002 — late (15 min)
            [
                'employee_id' => $employeeIdMap['EMP-002'],
                'date' => self::TEST_DATE,
                'check_in' => self::CHECK_IN_LATE_UTC,
                'check_out' => null,
                'lunch_start' => null,
                'lunch_end' => null,
                'entry_late_seconds' => 900,
                'lunch_late_seconds' => 0,
                'net_worked_minutes' => null,
                'overtime_minutes' => 0,
                'overtime_authorized' => false,
                'overtime_authorized_by' => null,
                'overtime_authorized_at' => null,
                'day_status' => 'WORKED',
                'confirmed_by' => null,
                'meta' => null,
                'public_id' => (string) Str::ulid(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // EMP-005 — day_off (attendance record exists with DAY_OFF, no check-in)
            [
                'employee_id' => $employeeIdMap['EMP-005'],
                'date' => self::TEST_DATE,
                'check_in' => null,
                'check_out' => null,
                'lunch_start' => null,
                'lunch_end' => null,
                'entry_late_seconds' => 0,
                'lunch_late_seconds' => 0,
                'net_worked_minutes' => null,
                'overtime_minutes' => 0,
                'overtime_authorized' => false,
                'overtime_authorized_by' => null,
                'overtime_authorized_at' => null,
                'day_status' => 'DAY_OFF',
                'confirmed_by' => null,
                'meta' => null,
                'public_id' => (string) Str::ulid(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    private function seedLeave(int $employeeId, int $leaveTypeId, int $adminUserId, mixed $now): void
    {
        DB::table('leaves')->insert([
            'public_id' => (string) Str::ulid(),
            'employee_id' => $employeeId,
            'leave_type_id' => $leaveTypeId,
            'start_date' => self::TEST_DATE,
            'end_date' => self::TEST_DATE,
            'pay_percentage' => null,
            'rest_day_factor' => null,
            'time_mode' => 'OPEN_ENDED',
            'scheduled_start_time' => null,
            'scheduled_end_time' => null,
            'actual_start_time' => null,
            'actual_end_time' => null,
            'actual_duration_minutes' => null,
            'status' => 'APPROVED',
            'requested_by' => $adminUserId,
            'approved_by' => $adminUserId,
            'approved_at' => $now,
            'notes' => 'Permiso de prueba (today-report-statuses)',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function markThursdayAsRestDay(int $employeeId): void
    {
        $periodId = DB::table('employment_periods')
            ->where('employee_id', $employeeId)
            ->where('is_active', true)
            ->value('id');

        $scheduleId = DB::table('employee_schedules')
            ->where('employment_period_id', $periodId)
            ->value('id');

        DB::table('schedule_days')
            ->where('employee_schedule_id', $scheduleId)
            ->where('day_of_week', self::DOW_THURSDAY)
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
