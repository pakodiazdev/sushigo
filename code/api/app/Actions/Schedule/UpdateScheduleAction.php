<?php

namespace App\Actions\Schedule;

use App\Models\EmployeeSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class UpdateScheduleAction
{
    /**
     * Update the currently active schedule in place, replacing its 7
     * ScheduleDay rows. Does not version the schedule — no previous schedule
     * is closed and no new EmployeeSchedule row is created.
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
    public function __invoke(EmployeeSchedule $schedule, array $data): EmployeeSchedule
    {
        return DB::transaction(function () use ($schedule, $data) {
            $newEffectiveFrom = Carbon::parse($data['effective_from'])->toDateString();

            $this->realignPreviousSchedule($schedule, $newEffectiveFrom);

            $schedule->update([
                'effective_from' => $newEffectiveFrom,
                'workday_type' => $data['workday_type'],
                'working_days_per_week' => $data['working_days_per_week'],
            ]);

            $schedule->scheduleDays()->delete();

            foreach ($data['days'] as $day) {
                $schedule->scheduleDays()->create($this->prepareDayData($day));
            }

            return $schedule->load('scheduleDays', 'employmentPeriod');
        });
    }

    /**
     * Keep the timeline contiguous when effective_from is moved: the immediately
     * preceding schedule (if any) must end the day before the new effective_from,
     * mirroring the auto-close behavior in CreateScheduleAction. Without this, moving
     * effective_from forward would leave a gap with no schedule coverage, and moving
     * it backward would overlap with the previous schedule.
     *
     * UpdateScheduleRequest::validatePreviousScheduleBoundary() guarantees the new
     * date is strictly after the previous schedule's own effective_from, so the
     * computed effective_to here never violates the DB CHECK constraint.
     */
    private function realignPreviousSchedule(EmployeeSchedule $schedule, string $newEffectiveFrom): void
    {
        $previous = $schedule->employmentPeriod
            ->employeeSchedules()
            ->where('id', '!=', $schedule->id)
            ->orderByDesc('effective_from')
            ->lockForUpdate()
            ->first();

        if (! $previous) {
            return;
        }

        $newEffectiveTo = Carbon::parse($newEffectiveFrom)->subDay()->toDateString();

        if ($previous->effective_to?->toDateString() !== $newEffectiveTo) {
            $previous->update(['effective_to' => $newEffectiveTo]);
        }
    }

    private function prepareDayData(array $day): array
    {
        $isDayOff = filter_var($day['is_day_off'], FILTER_VALIDATE_BOOLEAN);

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
