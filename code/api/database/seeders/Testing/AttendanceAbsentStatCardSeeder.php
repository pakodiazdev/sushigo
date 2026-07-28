<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * "Ausentes" stat card seeder — one employee per bucket for the
 * attendance-absent-stat-card Cypress spec:
 *   EMP-001 Mendoza, Carlos   → no attendance record (pending)
 *   EMP-002 García, María     → checked in, no check-out (checkedIn)
 *   EMP-003 López, Pedro      → day_status VACATION (absent, hidden from grid)
 *   EMP-004 Ramírez, Ana      → day_status ABSENCE (absent, stays in grid — "Justificar falta")
 *   EMP-005 Sánchez, Roberto  → day_status DAY_OFF (absent, hidden from grid)
 *
 * Employees must already exist (AttendanceTestSeeder ran first).
 */
class AttendanceAbsentStatCardSeeder extends Seeder
{
    private const TEST_DATE = '2026-04-09';

    private const CHECK_IN_UTC = '2026-04-09 19:00:00';

    public function run(): void
    {
        $now = now();

        $employeeIdMap = DB::table('employees')
            ->whereIn('code', ['EMP-002', 'EMP-003', 'EMP-004', 'EMP-005'])
            ->pluck('id', 'code')
            ->toArray();

        DB::table('attendances')->insert([
            $this->buildRow($employeeIdMap['EMP-002'], self::CHECK_IN_UTC, 'WORKED', $now),
            $this->buildRow($employeeIdMap['EMP-003'], null, 'VACATION', $now),
            $this->buildRow($employeeIdMap['EMP-004'], null, 'ABSENCE', $now),
            $this->buildRow($employeeIdMap['EMP-005'], null, 'DAY_OFF', $now),
        ]);
    }

    private function buildRow(int $employeeId, ?string $checkIn, string $dayStatus, mixed $now): array
    {
        return [
            'employee_id' => $employeeId,
            'date' => self::TEST_DATE,
            'check_in' => $checkIn,
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
            'day_status' => $dayStatus,
            'confirmed_by' => null,
            'meta' => null,
            'public_id' => (string) Str::ulid(),
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }
}
