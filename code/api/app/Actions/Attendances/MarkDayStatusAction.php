<?php

namespace App\Actions\Attendances;

use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Validation\ValidationException;

/**
 * Mark a specific date for an employee as DAY_OFF or ABSENCE without registering
 * check-in or check-out times.
 *
 * This action:
 *   1. Resolves the employee from their public_id
 *   2. Guards against duplicate attendance for the same date
 *   3. Persists an Attendance record with the given day_status (no check_in/check_out)
 *
 * All business rule violations are surfaced as 422 ValidationException.
 *
 * @see AP-019, RF-16
 */
class MarkDayStatusAction
{
    /**
     * @param  array{employee_id: string, date: string, day_status: string, reason?: string}  $data
     *
     * @throws ValidationException
     */
    public function __invoke(array $data): Attendance
    {
        $employee = Employee::where('public_id', $data['employee_id'])->firstOrFail();

        $this->guardNoDuplicateAttendance($employee->id, $data['date']);

        $attendance = new Attendance([
            'employee_id' => $employee->id,
            'date' => $data['date'],
            'day_status' => DayStatus::from($data['day_status']),
        ]);
        $attendance->auditReason = $data['reason'] ?? null;
        $attendance->save();

        return $attendance->load('employee');
    }

    /**
     * Throw a 422 if the employee already has an attendance record for this date.
     *
     * @throws ValidationException
     */
    private function guardNoDuplicateAttendance(int $employeeId, string $date): void
    {
        $exists = Attendance::where('employee_id', $employeeId)
            ->where('date', $date)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'date' => 'El empleado ya tiene un registro de asistencia para este día.',
            ]);
        }
    }
}
