<?php

namespace Database\Seeders\Development;

use App\Enums\WorkdayType;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use Carbon\Carbon;
use Database\Seeders\Base\OnceSeeder;

/**
 * Seed development schedules for all active employees.
 *
 * Assigns one EmployeeSchedule + 7 ScheduleDay rows per active EmploymentPeriod.
 * Uses 10 staggered lunch templates (A–J, every 30 min) assigned in round-robin
 * so employees don't all take lunch at the same time.
 *
 * Constants are defined in local CDT (America/Mexico_City) for readability,
 * but toUtcTime() converts them to UTC before database insertion.
 *
 * Local:  13:00 → 22:00 CDT  |  Lunch: 30 min  |  Rest day: Sunday (dow 7)
 * UTC:    19:00 → 04:00 UTC  (cross-midnight shift)
 *
 * @see Task #022b
 */
class EmployeeScheduleSeeder extends OnceSeeder
{
    /** Branch local timezone — times below are in CDT, converted to UTC on insert */
    private const TIMEZONE = 'America/Mexico_City';

    /** 10 staggered lunch windows in local CDT (start, end), every 30 minutes */
    private const LUNCH_TEMPLATES = [
        'A' => ['15:00:00', '15:30:00'],
        'B' => ['15:30:00', '16:00:00'],
        'C' => ['16:00:00', '16:30:00'],
        'D' => ['16:30:00', '17:00:00'],
        'E' => ['17:00:00', '17:30:00'],
        'F' => ['17:30:00', '18:00:00'],
        'G' => ['18:00:00', '18:30:00'],
        'H' => ['18:30:00', '19:00:00'],
        'I' => ['19:00:00', '19:30:00'],
        'J' => ['19:30:00', '20:00:00'],
    ];

    private const SHIFT_START = '13:00:00';  // 1 PM CDT → 19:00 UTC

    private const SHIFT_END = '22:00:00';  // 10 PM CDT → 04:00 UTC (next day)

    public function run(): void
    {
        $templateKeys = array_keys(self::LUNCH_TEMPLATES);
        $templateCount = count($templateKeys);

        // All active employment periods, ordered for consistent round-robin assignment
        $periods = EmploymentPeriod::with('employee')
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        $created = 0;
        $skipped = 0;

        foreach ($periods as $index => $period) {
            // Skip if this period already has an active (open-ended) schedule
            $hasActiveSchedule = EmployeeSchedule::where('employment_period_id', $period->id)
                ->whereNull('effective_to')
                ->exists();

            if ($hasActiveSchedule) {
                $this->command->info("⏭  Schedule already exists for period #{$period->id} ({$period->employee->code}), skipping");
                $skipped++;

                continue;
            }

            // Pick template via round-robin
            $templateKey = $templateKeys[$index % $templateCount];
            $lunchTimes = self::LUNCH_TEMPLATES[$templateKey];

            // Create the schedule using the factory's current() state
            // (effective_to = NULL, workday_type = FULL, working_days_per_week = 6)
            $schedule = EmployeeSchedule::factory()->current()->create([
                'employment_period_id' => $period->id,
                'name' => "Horario {$templateKey} — {$period->employee->code}",
                'effective_from' => $period->start_date,
                'working_days_per_week' => 6,
                'workday_type' => WorkdayType::FULL,
            ]);

            // Create 7 schedule days: Mon–Sat working, Sun rest
            foreach ($this->buildDays($schedule->id, $lunchTimes) as $dow => $dayConfig) {
                ScheduleDay::updateOrCreate(
                    ['employee_schedule_id' => $schedule->id, 'day_of_week' => $dow],
                    $dayConfig
                );
            }

            $this->command->info(
                "✓ Schedule {$templateKey} created for {$period->employee->code} ".
                "(lunch {$lunchTimes[0]}–{$lunchTimes[1]}, effective {$period->start_date})"
            );
            $created++;
        }

        $this->command->info(
            "✓ EmployeeScheduleSeeder done: {$created} created, {$skipped} skipped"
        );
    }

    /**
     * Build the 7 ScheduleDay configs for a schedule.
     *
     * @param  array{0:string,1:string}  $lunchTimes  [lunch_start, lunch_end]
     * @return array<int, array> Keyed by day_of_week (1=Mon … 7=Sun)
     */
    private function buildDays(int $scheduleId, array $lunchTimes): array
    {
        $workingDay = [
            'employee_schedule_id' => $scheduleId,
            'is_day_off' => false,
            'expected_start' => $this->toUtcTime(self::SHIFT_START),
            'expected_lunch_start' => $this->toUtcTime($lunchTimes[0]),
            'expected_lunch_end' => $this->toUtcTime($lunchTimes[1]),
            'expected_end' => $this->toUtcTime(self::SHIFT_END),
            'lunch_duration_minutes' => 30,
        ];

        $restDay = [
            'employee_schedule_id' => $scheduleId,
            'is_day_off' => true,
            'expected_start' => null,
            'expected_lunch_start' => null,
            'expected_lunch_end' => null,
            'expected_end' => null,
            'lunch_duration_minutes' => null,
        ];

        return [
            1 => $workingDay,   // Monday
            2 => $workingDay,   // Tuesday
            3 => $workingDay,   // Wednesday
            4 => $workingDay,   // Thursday
            5 => $workingDay,   // Friday
            6 => $workingDay,   // Saturday
            7 => $restDay,      // Sunday — rest day
        ];
    }

    /**
     * Convert a local CDT time string to its UTC equivalent.
     *
     * Example: '13:00:00' (America/Mexico_City) → '19:00:00' (UTC)
     */
    private function toUtcTime(string $localTime): string
    {
        return Carbon::parse($localTime, self::TIMEZONE)
            ->utc()
            ->format('H:i:s');
    }
}
