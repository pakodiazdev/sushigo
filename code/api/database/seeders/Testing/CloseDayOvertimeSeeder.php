<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Close-day overtime seeder — "returned" employees whose shift ended at 22:00.
 * When the manager closes the day at 22:35, each employee gets 35 min overtime.
 *
 * Seeds: EMP-005 (Sánchez, Roberto) + EMP-006 (Torres, Laura) → "returned"
 * Absent: EMP-007, EMP-008 → no attendance record (will be ABSENCE on close-day)
 *
 * Schedule expected_end = 22:00 CDMX (04:00 UTC next day).
 * Close time 22:35 CDMX → overtime_minutes = 35 for both employees.
 */
class CloseDayOvertimeSeeder extends Seeder
{
    use CloseDayAttendanceBuilder;

    public function run(): void
    {
        $now = now();

        $employeeIdMap = DB::table('employees')
            ->whereIn('code', ['EMP-005', 'EMP-006'])
            ->pluck('id', 'code')
            ->toArray();

        $attendanceRows = [];

        foreach (['EMP-005', 'EMP-006'] as $code) {
            $attendanceRows[] = $this->buildAttendanceRow($employeeIdMap[$code], lunchReturned: true, now: $now);
        }

        // EMP-007, EMP-008 → NO attendance record (pending → ABSENCE on close-day)

        DB::table('attendances')->insert($attendanceRows);
    }
}
