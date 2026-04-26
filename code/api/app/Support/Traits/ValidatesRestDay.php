<?php

namespace App\Support\Traits;

use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Shared helper to assert that a given date falls on a rest day in the
 * employee's current schedule.
 *
 * A negotiated extra day can only be registered for a day that is marked
 * as a rest day (is_day_off = true) in the employee's active schedule.
 * If no schedule exists yet, the guard passes silently.
 */
trait ValidatesRestDay
{
    /**
     * Throw a 422 if the given date is not a rest day for the employee's schedule.
     *
     * @throws ValidationException
     */
    private function guardIsRestDay(EmploymentPeriod $period, string $date): void
    {
        $dayOfWeek = Carbon::parse($date)->dayOfWeekIso;

        $schedule = EmployeeSchedule::effective($date)
            ->where('employment_period_id', $period->id)
            ->first();

        if ($schedule === null) {
            return;
        }

        $scheduleDay = $schedule->dayConfig($dayOfWeek);

        if ($scheduleDay !== null && ! $scheduleDay->is_day_off) {
            throw ValidationException::withMessages([
                'date' => 'El día seleccionado no es un día de descanso del empleado.',
            ]);
        }
    }
}
