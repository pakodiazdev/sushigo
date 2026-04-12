<?php

namespace App\Actions\Attendances;

use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Record the Manager's decision on whether to pay an employee's overtime.
 *
 * Business rules:
 *   1. The attendance must have overtime_minutes > 0; otherwise 422.
 *   2. A decision can only be recorded once (detected via overtime_authorized_at); otherwise 422.
 *   3. authorize = true  → overtime_authorized = true,  records who/when
 *      authorize = false → overtime_authorized = false, records when (no "who" needed)
 *
 * Note: overtime_authorized_at is always set on both authorize and reject so that
 * "no decision yet" (null) can be distinguished from "decision recorded" (not null).
 *
 * @see AP-016, AP-018 · RF-47a, RF-47b, RF-48, DC-01
 */
class RecordOvertimeDecisionAction
{
    /**
     * @param  Attendance  $attendance  Already-loaded attendance record
     * @param  array{authorize: bool}  $data  Validated request data
     * @param  User  $decidedBy  Authenticated user recording the decision
     *
     * @throws ValidationException
     */
    public function __invoke(Attendance $attendance, array $data, User $decidedBy): Attendance
    {
        $this->guardHasOvertime($attendance);
        $this->guardNoDecisionYet($attendance);

        $authorize = (bool) $data['authorize'];

        $attendance->update([
            'overtime_authorized' => $authorize,
            'overtime_authorized_by' => $authorize ? $decidedBy->id : null,
            'overtime_authorized_at' => Carbon::now()->utc(),
        ]);

        return $attendance->fresh(['employee']);
    }

    /**
     * @throws ValidationException
     */
    private function guardHasOvertime(Attendance $attendance): void
    {
        if (($attendance->overtime_minutes ?? 0) === 0) {
            throw ValidationException::withMessages([
                'authorize' => 'Este registro no tiene horas extra que autorizar.',
            ]);
        }
    }

    /**
     * A decision was already recorded when overtime_authorized_at is not null.
     * Both authorize and reject set this timestamp so "pending" = null.
     *
     * @throws ValidationException
     */
    private function guardNoDecisionYet(Attendance $attendance): void
    {
        if ($attendance->overtime_authorized_at !== null) {
            throw ValidationException::withMessages([
                'authorize' => 'Ya se registró una decisión sobre las horas extra de este empleado.',
            ]);
        }
    }
}
