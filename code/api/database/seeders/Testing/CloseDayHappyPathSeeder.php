<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Close-day happy-path seeder — only "returned" employees, NO pending lunches.
 *
 * Seeds: EMP-005, EMP-006 → "returned" (check-in + lunch + return, no check-out)
 * Absent: EMP-007, EMP-008 → no attendance record (will be ABSENCE on close-day)
 */
class CloseDayHappyPathSeeder extends Seeder
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
