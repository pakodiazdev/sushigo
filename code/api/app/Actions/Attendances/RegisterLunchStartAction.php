<?php

namespace App\Actions\Attendances;

use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Register an employee's lunch-start (exit for lunch break) for the day.
 *
 * This action:
 *   1. Guards that the attendance already has a check_in (employee must be clocked in)
 *   2. Guards against duplicate lunch_start registration
 *   3. Persists the lunch_start datetime on the Attendance record
 *
 * Lunch tardiness (lunch_late_seconds) is NOT calculated here — that happens
 * on the lunch-return endpoint when the employee comes back.
 *
 * All business rule violations are surfaced as 422 ValidationException.
 *
 * @see AP-014, RF-14
 */
class RegisterLunchStartAction
{
    /**
     * @param  Attendance                    $attendance  Already-loaded attendance record
     * @param  array{lunch_start: string}    $data        Validated request data
     *
     * @throws ValidationException
     */
    public function __invoke(Attendance $attendance, array $data): Attendance
    {
        $this->guardCheckInExists($attendance);
        $this->guardNoDuplicateLunchStart($attendance);

        $lunchStart = Carbon::parse($data['lunch_start']);

        $attendance->update(['lunch_start' => $lunchStart]);

        return $attendance->load('employee');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

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

    /**
     * Throw a 422 if lunch_start was already registered for this attendance.
     *
     * @throws ValidationException
     */
    private function guardNoDuplicateLunchStart(Attendance $attendance): void
    {
        if ($attendance->lunch_start) {
            throw ValidationException::withMessages([
                'lunch_start' => 'La salida a comida ya fue registrada para este día.',
            ]);
        }
    }
}
