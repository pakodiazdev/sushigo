<?php

namespace App\Actions\Attendances\Concerns;

use App\Models\Attendance;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use App\Models\ScheduleDayOverride;

/**
 * Shared override-aware schedule day resolution for attendance actions.
 *
 * A ScheduleDayOverride active on the attendance date takes full precedence
 * over the base ScheduleDay. This allows managers to mark a normally-off day
 * as workable (or vice-versa) for a specific date range without changing the
 * base schedule.
 *
 * Returns null (non-blocking) when any step fails — callers default to 0
 * for calculated values rather than interrupting the operational flow.
 *
 * Used by: RegisterCheckOutAction, RegisterLunchReturnAction.
 * RegisterCheckInAction uses its own blocking version with specific 422 messages.
 *
 * @see AP-012, RF-10
 */
trait ResolvesEffectiveScheduleDay
{
    /**
     * Resolve the effective schedule configuration for an attendance record's date.
     *
     * Resolution order:
     *   1. Find the active employment period for the employee on that date.
     *   2. Find the effective EmployeeSchedule for that period on that date.
     *   3. Look for a ScheduleDayOverride active on that date — if found, use it.
     *   4. Fall back to the base ScheduleDay from the employee's schedule.
     *
     * Returns null if the period, schedule, or day config cannot be resolved,
     * or if the resolved configuration marks the day as a rest day.
     */
    protected function resolveEffectiveScheduleDay(Attendance $attendance): ScheduleDay|ScheduleDayOverride|null
    {
        $date = $attendance->date->toDateString();
        $dayOfWeek = $attendance->date->dayOfWeekIso;

        $period = EmploymentPeriod::where('employee_id', $attendance->employee_id)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $date);
            })
            ->first();

        if (! $period) {
            return null;
        }

        $schedule = EmployeeSchedule::effective($date)
            ->where('employment_period_id', $period->id)
            ->first();

        if (! $schedule) {
            return null;
        }

        // Override takes precedence — check it first.
        $override = ScheduleDayOverride::effective($date)
            ->where('employment_period_id', $period->id)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        if ($override) {
            return $override->is_day_off ? null : $override;
        }

        // Fall back to the base schedule day.
        $scheduleDay = $schedule->dayConfig($dayOfWeek);

        if (! $scheduleDay || $scheduleDay->isDayOff()) {
            return null;
        }

        return $scheduleDay;
    }
}
