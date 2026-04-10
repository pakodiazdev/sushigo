<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
    private const TEST_DATE = '2026-04-02';

    private const CHECK_IN_UTC = '2026-04-02 19:00:00';

    private const LUNCH_START_UTC = '2026-04-02 20:00:00';

    private const LUNCH_END_UTC = '2026-04-02 21:00:00';

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
            $attendanceRows[] = [
                'employee_id' => $employeeIdMap[$code],
                'date' => self::TEST_DATE,
                'check_in' => self::CHECK_IN_UTC,
                'check_out' => null,
                'lunch_start' => self::LUNCH_START_UTC,
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
            ];
        }

        // ── "returned" employee: check-in + lunch + return, NO check-out ──

        $attendanceRows[] = [
            'employee_id' => $employeeIdMap['EMP-003'],
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

        // EMP-004 → NO attendance record (pending → ABSENCE on close-day)

        DB::table('attendances')->insert($attendanceRows);
    }
}
