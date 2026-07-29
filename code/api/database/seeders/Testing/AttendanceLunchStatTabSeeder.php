<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * "En comida" stat tab seeder — one employee per bucket, including the
 * at-lunch bucket split out of checkedIn, for the attendance-lunch-stat-tab
 * Cypress spec:
 *   EMP-001 Mendoza, Carlos   → no attendance record (pending)
 *   EMP-002 García, María     → checked in, no lunch (checkedIn)
 *   EMP-003 López, Pedro      → checked in, at lunch, no lunch_end (atLunch)
 *   EMP-004 Ramírez, Ana      → checked in, lunch done, back at work (checkedIn — "returned")
 *   EMP-005 Sánchez, Roberto  → checked out (done)
 *
 * Employees must already exist (AttendanceTestSeeder ran first).
 */
class AttendanceLunchStatTabSeeder extends Seeder
{
    private const TEST_DATE = '2026-04-09';

    private const CHECK_IN_UTC = '2026-04-09 19:00:00';

    private const LUNCH_START_UTC = '2026-04-09 20:00:00';

    private const LUNCH_END_UTC = '2026-04-09 20:30:00';

    private const CHECK_OUT_UTC = '2026-04-09 23:00:00';

    public function run(): void
    {
        $now = now();

        $employeeIdMap = DB::table('employees')
            ->whereIn('code', ['EMP-002', 'EMP-003', 'EMP-004', 'EMP-005'])
            ->pluck('id', 'code')
            ->toArray();

        DB::table('attendances')->insert([
            $this->buildRow($employeeIdMap['EMP-002'], self::CHECK_IN_UTC, null, null, null, $now),
            $this->buildRow($employeeIdMap['EMP-003'], self::CHECK_IN_UTC, self::LUNCH_START_UTC, null, null, $now),
            $this->buildRow($employeeIdMap['EMP-004'], self::CHECK_IN_UTC, self::LUNCH_START_UTC, self::LUNCH_END_UTC, null, $now),
            $this->buildRow($employeeIdMap['EMP-005'], self::CHECK_IN_UTC, self::LUNCH_START_UTC, self::LUNCH_END_UTC, self::CHECK_OUT_UTC, $now),
        ]);
    }

    private function buildRow(int $employeeId, ?string $checkIn, ?string $lunchStart, ?string $lunchEnd, ?string $checkOut, mixed $now): array
    {
        return [
            'employee_id' => $employeeId,
            'date' => self::TEST_DATE,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'lunch_start' => $lunchStart,
            'lunch_end' => $lunchEnd,
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
}
