<?php

namespace App\Actions\Schedule;

use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CreateScheduleAction
{
    /**
     * Create a new schedule version for an employment period.
     *
     * Wraps the schedule header + 7 ScheduleDay records in a single DB
     * transaction. If a previous open-ended schedule exists, its effective_to
     * is set to (new.effective_from − 1 day) automatically.
     *
     * @param  array{
     *     effective_from: string,
     *     workday_type: string,
     *     working_days_per_week: int,
     *     days: array<int, array{
     *         day_of_week: int,
     *         is_day_off: bool,
     *         expected_start: string|null,
     *         expected_lunch_start: string|null,
     *         expected_lunch_end: string|null,
     *         lunch_duration_minutes: int|null,
     *         expected_end: string|null,
     *     }>
     * }  $data
     */
    public function __invoke(EmploymentPeriod $period, array $data): EmployeeSchedule
    {
        return DB::transaction(function () use ($period, $data) {
            $effectiveFrom = Carbon::parse($data['effective_from'])->toDateString();

            // Close the previous open-ended schedule for this period (if any).
            // Lock the row to prevent race conditions with concurrent creates.
            // Only close schedules whose effective_from is strictly before the new date
            // to avoid violating the employee_schedules_effective_range_check constraint
            // (which requires effective_to >= effective_from).
            $closingTo = Carbon::parse($effectiveFrom)->subDay()->toDateString();

            $period->employeeSchedules()
                ->whereNull('effective_to')
                ->where('effective_from', '<', $effectiveFrom)
                ->lockForUpdate()
                ->get()
                ->each(fn ($schedule) => $schedule->update(['effective_to' => $closingTo]));

            $schedule = $period->employeeSchedules()->create([
                'effective_from' => $effectiveFrom,
                'effective_to' => null,
                'workday_type' => $data['workday_type'],
                'working_days_per_week' => $data['working_days_per_week'],
            ]);

            foreach ($data['days'] as $day) {
                $schedule->scheduleDays()->create($this->prepareDayData($day));
            }

            return $schedule->load('scheduleDays', 'employmentPeriod');
        });
    }

    private function prepareDayData(array $day): array
    {
        $isDayOff = (bool) $day['is_day_off'];

        return [
            'day_of_week' => $day['day_of_week'],
            'is_day_off' => $isDayOff,
            'expected_start' => $isDayOff ? null : ($day['expected_start'] ?? null),
            'expected_lunch_start' => $isDayOff ? null : ($day['expected_lunch_start'] ?? null),
            'expected_lunch_end' => $isDayOff ? null : ($day['expected_lunch_end'] ?? null),
            'lunch_duration_minutes' => $isDayOff ? null : ($day['lunch_duration_minutes'] ?? null),
            'expected_end' => $isDayOff ? null : ($day['expected_end'] ?? null),
        ];
    }
}
