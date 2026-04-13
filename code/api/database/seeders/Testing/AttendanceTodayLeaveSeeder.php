<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Today-leave context seeder — seeds an approved leave covering "today" (test time)
 * on EMP-007 (full-day, OPEN_ENDED, paid) and EMP-008 (partial, SCHEDULED, unpaid).
 *
 * Used by the attendance-today-leave-context Cypress spec via:
 *   cy.task('test:reset', 'attendance-today-leave')
 *
 * Employees must already exist (AttendanceTestSeeder ran first).
 * Leave types must already exist (CoreTestSeeder ran first).
 */
class AttendanceTodayLeaveSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // Resolve employees
        $employeeIdMap = DB::table('employees')
            ->whereIn('code', ['EMP-007', 'EMP-008'])
            ->pluck('id', 'code')
            ->toArray();

        // Resolve leave types seeded by CoreTestSeeder
        $leaveTypeMap = DB::table('leave_types')
            ->whereIn('code', ['PERMISSION_PAID', 'PERMISSION_HOURS'])
            ->pluck('id', 'code')
            ->toArray();

        // Resolve the admin user as "requested_by" (always present after CoreTestSeeder)
        $adminUserId = DB::table('users')->where('email', 'admin@sushigo.com')->value('id');

        // Test date matches what the Cypress spec sends via X-Test-Time
        $testDate = '2026-04-09';

        DB::table('leaves')->insert([
            // EMP-007: approved full-day paid leave (OPEN_ENDED, FIXED_PERCENTAGE 100%)
            [
                'public_id' => (string) Str::ulid(),
                'employee_id' => $employeeIdMap['EMP-007'],
                'leave_type_id' => $leaveTypeMap['PERMISSION_PAID'],
                'start_date' => $testDate,
                'end_date' => $testDate,
                'pay_percentage' => null,   // use type default (100%)
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
                'notes' => 'Permiso con goce de sueldo (test)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // EMP-008: approved partial unpaid leave (SCHEDULED, PROPORTIONAL_HOURS)
            // Shift is 13:00-22:00 CDMX; leave covers 13:00-16:00
            // → employee is absent 13:00-16:00, arrives at work at 16:00 (ends_at)
            [
                'public_id' => (string) Str::ulid(),
                'employee_id' => $employeeIdMap['EMP-008'],
                'leave_type_id' => $leaveTypeMap['PERMISSION_HOURS'],
                'start_date' => $testDate,
                'end_date' => $testDate,
                'pay_percentage' => null,   // use type default (0%)
                'rest_day_factor' => null,
                'time_mode' => 'SCHEDULED',
                'scheduled_start_time' => '13:00:00',
                'scheduled_end_time' => '16:00:00',
                'actual_start_time' => null,
                'actual_end_time' => null,
                'actual_duration_minutes' => null,
                'status' => 'APPROVED',
                'requested_by' => $adminUserId,
                'approved_by' => $adminUserId,
                'approved_at' => $now,
                'notes' => 'Permiso por horas (test)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
