<?php

namespace App\Actions\Attendances;

use App\Actions\Attendances\Concerns\ResolvesEffectiveScheduleDay;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Register an employee's lunch-start (exit for lunch break) for the day.
 *
 * This action:
 *   1. Guards that the attendance already has a check_in (employee must be clocked in)
 *   2. Persists the lunch_start datetime on the Attendance record — overwriting an
 *      already-recorded value is a correction, already authorized upstream in
 *      LunchStartRequest (AttendancePolicy::edit + attendances.update)
 *   3. If lunch_end is already recorded (correcting lunch_start after the employee
 *      already returned), recalculates lunch_late_seconds against the NEW
 *      lunch_start — otherwise it would silently keep reflecting the old,
 *      now-incorrect value
 *   4. If check_out is already recorded (correcting lunch_start on an
 *      already-completed day), recalculates net_worked_minutes too
 *
 * Lunch tardiness (lunch_late_seconds) is otherwise NOT calculated here — that
 * happens on the lunch-return endpoint when the employee comes back.
 *
 * All business rule violations are surfaced as 422 ValidationException.
 *
 * @see AP-014, RF-14
 */
class RegisterLunchStartAction
{
    use ResolvesEffectiveScheduleDay;

    /**
     * @param  Attendance  $attendance  Already-loaded attendance record
     * @param  array{lunch_start: string}  $data  Validated request data
     *
     * @throws ValidationException
     */
    public function __invoke(Attendance $attendance, array $data): Attendance
    {
        $this->guardCheckInExists($attendance);

        $lunchStart = Carbon::parse($data['lunch_start'])->utc();

        $updateData = ['lunch_start' => $lunchStart];

        if ($attendance->lunch_end !== null) {
            $updateData['lunch_late_seconds'] = $this->calculateLunchLateSeconds(
                $attendance,
                $lunchStart,
                Carbon::parse($attendance->lunch_end),
            );
        }

        if ($attendance->check_out !== null) {
            $updateData['net_worked_minutes'] = $this->calculateNetWorkedMinutes(
                Carbon::parse($attendance->check_in),
                $lunchStart,
                $attendance->lunch_end ? Carbon::parse($attendance->lunch_end) : null,
                Carbon::parse($attendance->check_out),
            );
        }

        $attendance->auditReason = $data['reason'] ?? null;
        $attendance->update($updateData);

        return $attendance->load('employee');
    }

    /**
     * Throw a 422 if the attendance has no check_in recorded.
     *
     * @throws ValidationException
     */
    private function guardCheckInExists(Attendance $attendance): void
    {
        if (! $attendance->check_in) {
            throw ValidationException::withMessages([
                'lunch_start' => 'El empleado no tiene check-in registrado para este día.',
            ]);
        }
    }
}
