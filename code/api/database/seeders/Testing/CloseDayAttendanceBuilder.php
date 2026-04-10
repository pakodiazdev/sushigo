<?php

namespace Database\Seeders\Testing;

use Illuminate\Support\Str;

/**
 * Shared attendance-row builder for close-day test seeders.
 *
 * Times stored in UTC (CDMX = UTC-6):
 *   13:00 CDMX = 19:00 UTC
 *   14:00 CDMX = 20:00 UTC
 *   15:00 CDMX = 21:00 UTC
 */
trait CloseDayAttendanceBuilder
{
    private const TEST_DATE = '2026-04-02';

    private const CHECK_IN_UTC = '2026-04-02 19:00:00';

    private const LUNCH_START_UTC = '2026-04-02 20:00:00';

    private const LUNCH_END_UTC = '2026-04-02 21:00:00';

    /**
     * Build a single attendance row array.
     *
     * @param  int  $employeeId  DB employee ID
     * @param  bool  $lunchReturned  Whether the employee returned from lunch
     */
    private function buildAttendanceRow(int $employeeId, bool $lunchReturned, mixed $now): array
    {
        return [
            'employee_id' => $employeeId,
            'date' => self::TEST_DATE,
            'check_in' => self::CHECK_IN_UTC,
            'check_out' => null,
            'lunch_start' => self::LUNCH_START_UTC,
            'lunch_end' => $lunchReturned ? self::LUNCH_END_UTC : null,
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
