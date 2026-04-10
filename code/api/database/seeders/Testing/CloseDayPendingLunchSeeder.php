<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Close-day pending-lunch seeder — employees still "at lunch" when manager closes.
 *
 * Seeds:
 *   EMP-001, EMP-002 → "at-lunch" (check-in + lunch, NO return)
 *   EMP-003          → "returned" (check-in + lunch + return, no check-out)
 * Absent:
 *   EMP-004 → no attendance record (will be ABSENCE on close-day)
 */
class CloseDayPendingLunchSeeder extends Seeder
{
    use CloseDayAttendanceBuilder;

    public function run(): void
    {
        $now = now();

        $employeeIdMap = DB::table('employees')
            ->whereIn('code', ['EMP-001', 'EMP-002', 'EMP-003'])
            ->pluck('id', 'code')
            ->toArray();

        $attendanceRows = [];

        // ── "at-lunch" employees: check-in + lunch-start, NO lunch-return ──

        foreach (['EMP-001', 'EMP-002'] as $code) {
            $attendanceRows[] = $this->buildAttendanceRow($employeeIdMap[$code], lunchReturned: false, now: $now);
        }

        // ── "returned" employee: check-in + lunch + return, NO check-out ──

        $attendanceRows[] = $this->buildAttendanceRow($employeeIdMap['EMP-003'], lunchReturned: true, now: $now);

        // EMP-004 → NO attendance record (pending → ABSENCE on close-day)

        DB::table('attendances')->insert($attendanceRows);
    }
}
