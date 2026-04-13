<?php

namespace App\Actions\Attendances;

use App\Actions\Attendances\Concerns\ResolvesEffectiveScheduleDay;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Register an employee's lunch-return (return from lunch break) for the day.
 *
 * This action:
 *   1. Guards that the attendance already has a lunch_start (employee must have left for lunch)
 *   2. Guards against duplicate lunch_end registration
 *   3. Attempts to resolve the employee's schedule to calculate lunch_late_seconds
 *   4. Calculates: lunch_late_seconds = max(0, lunch_end − expected_return)
 *      where expected_return = lunch_start + scheduleDay.lunch_duration_minutes
 *   5. Persists lunch_end and lunch_late_seconds on the Attendance record
 *
 * If the schedule or lunch_duration_minutes cannot be resolved, lunch_late_seconds
 * is set to 0 rather than blocking the registration — the operational flow
 * must not be interrupted by incomplete schedule configuration.
 *
 * All business rule violations are surfaced as 422 ValidationException.
 *
 * @see AP-014, RF-14, RF-15a
 */
class RegisterLunchReturnAction
{
    use ResolvesEffectiveScheduleDay;

    /**
     * @param  Attendance  $attendance  Already-loaded attendance record
     * @param  array{lunch_end: string}  $data  Validated request data
     *
     * @throws ValidationException
     */
    public function __invoke(Attendance $attendance, array $data): Attendance
    {
        $this->guardLunchStartExists($attendance);
        $this->guardNoDuplicateLunchEnd($attendance);

        $lunchEnd = Carbon::parse($data['lunch_end'])->utc();

        $lunchLateSeconds = $this->calculateLunchLateSeconds($attendance, $lunchEnd);

        $attendance->update([
            'lunch_end' => $lunchEnd,
            'lunch_late_seconds' => $lunchLateSeconds,
        ]);

        return $attendance->load('employee');
    }

    /**
     * Throw a 422 if the attendance has no lunch_start recorded.
     *
     * @throws ValidationException
     */
    private function guardLunchStartExists(Attendance $attendance): void
    {
        if (! $attendance->lunch_start) {
            throw ValidationException::withMessages([
                'lunch_end' => 'El empleado no tiene salida a comida registrada para este día.',
            ]);
        }
    }

    /**
     * Throw a 422 if lunch_end was already registered for this attendance.
     *
     * @throws ValidationException
     */
    private function guardNoDuplicateLunchEnd(Attendance $attendance): void
    {
        if ($attendance->lunch_end) {
            throw ValidationException::withMessages([
                'lunch_end' => 'El regreso de comida ya fue registrado para este día.',
            ]);
        }
    }

    /**
     * Calculate lunch tardiness in seconds.
     *
     * Resolves the schedule for the attendance date and uses
     * ScheduleDay::expectedLunchReturnTime() to determine when the employee
     * was expected back.
     *
     * Returns 0 if the schedule cannot be resolved or lunch_duration_minutes
     * is not configured — incomplete configuration should not block the flow.
     */
    private function calculateLunchLateSeconds(Attendance $attendance, Carbon $lunchEnd): int
    {
        $scheduleDay = $this->resolveEffectiveScheduleDay($attendance);

        if (! $scheduleDay || ! $scheduleDay->lunch_duration_minutes) {
            return 0;
        }

        $expectedReturn = Carbon::parse($attendance->lunch_start)
            ->addMinutes($scheduleDay->lunch_duration_minutes);

        return (int) max(0, $lunchEnd->timestamp - $expectedReturn->timestamp);
    }
}
