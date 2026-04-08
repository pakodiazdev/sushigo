<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Close-day test seeder — pre-creates attendance records for close-day Cypress specs.
 *
 * Depends on: AttendanceTestSeeder (employees, schedules, employment periods must exist).
 *
 * Creates attendance records for 2026-04-02 (matching TEST_TIME in the Cypress spec)
 * with employees in specific attendance phases so the close-day wizard can be tested
 * without manually building up state through the UI.
 *
 * Employee assignments (using config employees from seeders.php):
 *
 *   Test 1 — Happy path (no pending lunch returns):
 *     EMP-005  Sánchez, Roberto  → "returned" (check-in + lunch + return, no check-out)
 *     EMP-006  Torres, Laura     → "returned" (check-in + lunch + return, no check-out)
 *     EMP-007  Flores, Miguel    → "pending"  (no attendance record → will be ABSENCE)
 *     EMP-008  Vargas, Sofia     → "pending"  (no attendance record → will be ABSENCE)
 *
 *   Test 2 — Pending lunch returns ("se le pasó al encargado"):
 *     EMP-001  Mendoza, Carlos   → "at-lunch" (check-in + lunch, NO return)
 *     EMP-002  García, María     → "at-lunch" (check-in + lunch, NO return)
 *     EMP-003  López, Pedro      → "returned" (check-in + lunch + return, no check-out)
 *     EMP-004  Ramírez, Ana      → "pending"  (no attendance record → will be ABSENCE)
 *
 * Times stored in UTC (CDMX = UTC-6):
 *   13:00 CDMX = 19:00 UTC
 *   14:00 CDMX = 20:00 UTC
 *   15:00 CDMX = 21:00 UTC
 *
 * No idempotency checks — always starts from truncated tables.
 */
class CloseDayTestSeeder extends Seeder
{
    /** Test date for all attendance records */
    private const TEST_DATE = '2026-04-02';

    /** CDMX times converted to UTC (offset -06:00) */
    private const CHECK_IN_UTC = '2026-04-02 19:00:00';   // 13:00 CDMX

    private const LUNCH_START_UTC = '2026-04-02 20:00:00'; // 14:00 CDMX

    private const LUNCH_END_UTC = '2026-04-02 21:00:00';   // 15:00 CDMX

    public function run(): void
    {
        $now = now();

        $employeeIdMap = DB::table('employees')
            ->whereIn('code', ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-005', 'EMP-006'])
            ->pluck('id', 'code')
            ->toArray();

        $attendanceRows = [];

        // ── "at-lunch" employees (Test 2): check-in + lunch-start, NO lunch-return ──

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

        // ── "returned" employees (Test 1 & 2): check-in + lunch + return, NO check-out ──

        foreach (['EMP-003', 'EMP-005', 'EMP-006'] as $code) {
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

        // EMP-004, EMP-007, EMP-008 → NO attendance record (pending → ABSENCE on close-day)

        DB::table('attendances')->insert($attendanceRows);
    }
}
