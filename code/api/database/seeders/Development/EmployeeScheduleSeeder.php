<?php

namespace Database\Seeders\Development;

use App\Enums\WorkdayType;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use Database\Seeders\Base\OnceSeeder;

/**
 * Seed development schedules for all active employees.
 *
 * Assigns one EmployeeSchedule + 7 ScheduleDay rows per active EmploymentPeriod.
 * Uses 10 staggered lunch templates (A–J, every 30 min) assigned in round-robin
 * so employees don't all take lunch at the same time.
 *
 * Schedule times are stored as local clock times (America/Mexico_City, CST UTC-6).
 * Time columns (time, not timestamp) represent "hour on the clock", not an instant
 * in time, so UTC conversion is not applicable — store what the clock shows.
 *
 * Local: 13:00 → 22:00 CST  |  Lunch: 30 min  |  Rest day: Sunday (dow 7)
 *
 * @see Task #022b
 */
class EmployeeScheduleSeeder extends OnceSeeder
{
    /** 10 staggered lunch windows in local CST (start, end), every 30 minutes */
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

    private const SHIFT_START = '13:00:00';  // 1 PM local

    private const SHIFT_END = '22:00:00';  // 10 PM local

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

            // Pick lunch template via round-robin (10 templates A–J)
            $templateKey = $templateKeys[$index % $templateCount];
            $lunchTimes = self::LUNCH_TEMPLATES[$templateKey];

            // Rotate rest day across all 7 ISO days of the week (1=Mon … 7=Sun)
            // so at least one employee is off on each day of the week.
            $restDayDow = ($index % 7) + 1;
            $restDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            $restDayLabel = $restDayNames[$restDayDow - 1];

            // Create the schedule using the factory's current() state
            // (effective_to = NULL, workday_type = FULL, working_days_per_week = 6)
            $schedule = EmployeeSchedule::factory()->current()->create([
                'employment_period_id' => $period->id,
                'effective_from' => $period->start_date,
                'working_days_per_week' => 6,
                'workday_type' => WorkdayType::FULL,
            ]);

            // Create 7 schedule days with rotated rest day
            foreach ($this->buildDays($schedule->id, $lunchTimes, $restDayDow) as $dow => $dayConfig) {
                ScheduleDay::updateOrCreate(
                    ['employee_schedule_id' => $schedule->id, 'day_of_week' => $dow],
                    $dayConfig
                );
            }

            $this->command->info(
                "✓ Schedule {$templateKey} created for {$period->employee->code} ".
                "(lunch {$lunchTimes[0]}–{$lunchTimes[1]}, rest: {$restDayLabel}, effective {$period->start_date})"
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
     * The rest day rotates across all 7 ISO days of the week so that at least
     * one employee is off on each day — making every scenario (including extra
     * day express) testable on any given day without manual setup.
     *
     * @param  array{0:string,1:string}  $lunchTimes  [lunch_start, lunch_end]
     * @param  int  $restDayDow  ISO day of week for the rest day (1=Mon … 7=Sun)
     * @return array<int, array> Keyed by day_of_week (1=Mon … 7=Sun)
     */
    private function buildDays(int $scheduleId, array $lunchTimes, int $restDayDow = 7): array
    {
        $days = [];

        for ($dow = 1; $dow <= 7; $dow++) {
            if ($dow === $restDayDow) {
                $days[$dow] = [
                    'employee_schedule_id' => $scheduleId,
                    'is_day_off' => true,
                    'expected_start' => null,
                    'expected_lunch_start' => null,
                    'expected_lunch_end' => null,
                    'expected_end' => null,
                    'lunch_duration_minutes' => null,
                ];
            } else {
                $days[$dow] = [
                    'employee_schedule_id' => $scheduleId,
                    'is_day_off' => false,
                    'expected_start' => self::SHIFT_START,
                    'expected_lunch_start' => $lunchTimes[0],
                    'expected_lunch_end' => $lunchTimes[1],
                    'expected_end' => self::SHIFT_END,
                    'lunch_duration_minutes' => 30,
                ];
            }
        }

        return $days;
    }
}
