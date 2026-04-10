<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Close-day happy-path seeder — only "returned" employees, NO pending lunches.
 *
 * Seeds: EMP-005, EMP-006 → "returned" (check-in + lunch + return, no check-out)
 * Absent: EMP-007, EMP-008 → no attendance record (will be ABSENCE on close-day)
 */
class CloseDayHappyPathSeeder extends Seeder
{
    private const TEST_DATE = '2026-04-02';

    private const CHECK_IN_UTC = '2026-04-02 19:00:00';

    private const LUNCH_START_UTC = '2026-04-02 20:00:00';

    private const LUNCH_END_UTC = '2026-04-02 21:00:00';

    public function run(): void
    {
        $now = now();

        $employeeIdMap = DB::table('employees')
            ->whereIn('code', ['EMP-005', 'EMP-006'])
            ->pluck('id', 'code')
            ->toArray();

        $attendanceRows = [];

        foreach (['EMP-005', 'EMP-006'] as $code) {
            $attendanceRows[] = [
                'employee_id' => $employeeIdMap[$code],
                'date' => self::TEST_DATE,
                'check_in' => self::CHECK_IN_UTC,
                'check_out' => null,
                'lunch_start' => self::LUNCH_START_UTC,
                'lunch_end' => self::LUNCH_END_UTC,
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
            ];
        }

        // EMP-007, EMP-008 → NO attendance record (pending → ABSENCE on close-day)

        DB::table('attendances')->insert($attendanceRows);
    }
}
