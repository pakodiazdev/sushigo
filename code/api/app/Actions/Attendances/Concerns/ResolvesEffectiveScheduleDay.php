<?php

namespace App\Actions\Attendances\Concerns;

use App\Models\Attendance;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use App\Models\ScheduleDayOverride;
use Carbon\Carbon;

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
 * Used by: RegisterCheckInAction, RegisterLunchStartAction, RegisterLunchReturnAction,
 * RegisterCheckOutAction. RegisterCheckInAction resolves its own schedule day for the
 * blocking (422-message) day-off checks, but shares calculateNetWorkedMinutes() below.
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

        $schedule = $period
            ? EmployeeSchedule::effective($date)->where('employment_period_id', $period->id)->first()
            : null;

        if (! $period || ! $schedule) {
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

        return ($scheduleDay && ! $scheduleDay->isDayOff()) ? $scheduleDay : null;
    }

    /**
     * Calculate lunch tardiness in seconds:
     *   lunch_late_seconds = max(0, lunch_end − expected_return)
     *   where expected_return = lunch_start + scheduleDay.lunch_duration_minutes
     *
     * Takes both boundaries as parameters (rather than reading them off the
     * model) so callers can pass a value being corrected — e.g. correcting
     * lunch_start after lunch_end is already recorded must recalculate this
     * against the NEW lunch_start, not the stale one still on the model.
     *
     * Returns 0 if the schedule cannot be resolved or lunch_duration_minutes
     * is not configured — incomplete configuration should not block the flow.
     */
    protected function calculateLunchLateSeconds(Attendance $attendance, Carbon $lunchStart, Carbon $lunchEnd): int
    {
        $scheduleDay = $this->resolveEffectiveScheduleDay($attendance);

        if (! $scheduleDay || ! $scheduleDay->lunch_duration_minutes) {
            return 0;
        }

        $expectedReturn = $lunchStart->clone()->addMinutes($scheduleDay->lunch_duration_minutes);

        return (int) max(0, $lunchEnd->timestamp - $expectedReturn->timestamp);
    }

    /**
     * Calculate net worked minutes:
     *   gross = check_out − check_in  (in minutes)
     *   net   = gross − actual_lunch_duration  (only if both lunch_start and lunch_end exist)
     *
     * Takes every boundary as a parameter (rather than reading them off the
     * model) so callers can pass a value being corrected — e.g. correcting
     * check_in, lunch_start, or lunch_end on an already-completed day (one
     * that already has check_out) must recalculate this against the NEW
     * value, not the stale one still on the model.
     *
     * Returns 0 minimum (cannot be negative).
     */
    protected function calculateNetWorkedMinutes(Carbon $checkIn, ?Carbon $lunchStart, ?Carbon $lunchEnd, Carbon $checkOut): int
    {
        $grossMinutes = $checkIn->diffInMinutes($checkOut);

        // Deduct the actual lunch break only when both boundaries were recorded
        if ($lunchStart && $lunchEnd) {
            $grossMinutes -= $lunchStart->diffInMinutes($lunchEnd);
        }

        return (int) max(0, $grossMinutes);
    }
}
