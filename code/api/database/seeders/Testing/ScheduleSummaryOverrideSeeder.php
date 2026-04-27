<?php

namespace Database\Seeders\Testing;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Adds schedule day overrides to EMP-001 for testing the indefinite override summary.
 *
 * Requires AttendanceTestSeeder to have run first (EMP-001 must exist).
 *
 * Inserts:
 *  - 1 indefinite override: Wednesday (DOW=3) → 14:00–23:00 (effective_to null)
 *    The summary should group days and show "L, M, J, V, S · 1:00 PM – 10:00 PM · X · 2:00 PM – 11:00 PM"
 *  - 1 temporary override: Saturday (DOW=6) → 10:00–16:00 (expires next month)
 *    Only this one should be counted by the ⚡ badge (count = 1)
 */
class ScheduleSummaryOverrideSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $periodId = DB::table('employees as e')
            ->join('employment_periods as ep', 'ep.employee_id', '=', 'e.id')
            ->where('e.code', 'EMP-001')
            ->where('ep.is_active', true)
            ->value('ep.id');

        if (! $periodId) {
            return;
        }

        DB::table('schedule_day_overrides')->insert([
            [
                'public_id' => (string) Str::ulid(),
                'employment_period_id' => $periodId,
                'day_of_week' => 3, // Wednesday
                'effective_from' => '2020-01-01',
                'effective_to' => null,
                'is_day_off' => false,
                'expected_start' => '14:00:00',
                'expected_lunch_start' => '16:00:00',
                'expected_lunch_end' => '16:30:00',
                'lunch_duration_minutes' => 30,
                'expected_end' => '23:00:00',
                'note' => 'Miércoles turno diferente',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'public_id' => (string) Str::ulid(),
                'employment_period_id' => $periodId,
                'day_of_week' => 6, // Saturday
                'effective_from' => $now->toDateString(),
                'effective_to' => $now->copy()->addMonth()->toDateString(),
                'is_day_off' => false,
                'expected_start' => '10:00:00',
                'expected_lunch_start' => null,
                'expected_lunch_end' => null,
                'lunch_duration_minutes' => null,
                'expected_end' => '16:00:00',
                'note' => 'Sábado turno especial temporal',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
