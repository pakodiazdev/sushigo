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
 *   2. Attempts to resolve the employee's schedule to calculate lunch_late_seconds
 *   3. Calculates: lunch_late_seconds = max(0, lunch_end − expected_return)
 *      where expected_return = lunch_start + scheduleDay.lunch_duration_minutes
 *   4. Persists lunch_end and lunch_late_seconds on the Attendance record —
 *      overwriting an already-recorded value (and recalculating lunch_late_seconds)
 *      is a correction, already authorized upstream in LunchReturnRequest
 *      (AttendancePolicy::edit + attendances.update)
 *   5. If check_out is already recorded (correcting lunch_end on an
 *      already-completed day), recalculates net_worked_minutes too
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

        $lunchEnd = Carbon::parse($data['lunch_end'])->utc();

        $lunchLateSeconds = $this->calculateLunchLateSeconds(
            $attendance,
            Carbon::parse($attendance->lunch_start),
            $lunchEnd,
        );

        $updateData = [
            'lunch_end' => $lunchEnd,
            'lunch_late_seconds' => $lunchLateSeconds,
        ];

        if ($attendance->check_out !== null) {
            $updateData['net_worked_minutes'] = $this->calculateNetWorkedMinutes(
                Carbon::parse($attendance->check_in),
                Carbon::parse($attendance->lunch_start),
                $lunchEnd,
                Carbon::parse($attendance->check_out),
            );
        }

        $attendance->auditReason = $data['reason'] ?? null;
        $attendance->update($updateData);

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

    // calculateLunchLateSeconds() provided by ResolvesEffectiveScheduleDay trait
}
