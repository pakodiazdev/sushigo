<?php

namespace App\Actions\Attendances;

use App\Actions\Attendances\Concerns\ResolvesEffectiveScheduleDay;
use App\Enums\OvertimeMovementType;
use App\Enums\OvertimeOrigin;
use App\Models\Attendance;
use App\Models\OvertimeBankMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Register an employee's check-out (departure) for the day.
 *
 * This action:
 *   1. Guards that the attendance already has a check_in
 *   2. Calculates net_worked_minutes:
 *        (check_out − check_in) − actual_lunch_duration_if_both_recorded
 *   3. Calculates overtime_minutes:
 *        max(0, check_out − scheduleDay.expected_end) in whole minutes
 *      If the schedule cannot be resolved, overtime_minutes = 0 (non-blocking)
 *      ScheduleDayOverride takes precedence over the base ScheduleDay when present
 *   4. Persists check_out, net_worked_minutes, overtime_minutes — overwriting an
 *      already-recorded check_out is a correction, already authorized upstream in
 *      CheckOutRequest (AttendancePolicy::edit + attendances.update)
 *   5. Syncs the auto EARNED OvertimeBankMovement (origin=AUTO) for this attendance:
 *      creates it if none exists, updates its minutes on a correction, or deletes
 *      it if the correction brings overtime_minutes back to 0. A correction is
 *      REJECTED (422) once Attendance.overtime_authorized_at is set — i.e. the
 *      overtime decision was already recorded via RecordOvertimeDecisionAction.
 *      There is no reopen flow, so a settled overtime amount is never silently
 *      changed underneath it.
 *
 * All business rule violations are surfaced as 422 ValidationException.
 *
 * @see AP-015, AP-034, RF-12, RF-14, RF-42
 */
class RegisterCheckOutAction
{
    use ResolvesEffectiveScheduleDay;

    /**
     * @param  Attendance  $attendance  Already-loaded attendance record
     * @param  array{check_out: string}  $data  Validated request data
     *
     * @throws ValidationException
     */
    public function __invoke(Attendance $attendance, array $data): Attendance
    {
        $this->guardCheckInExists($attendance);

        $isCorrection = $attendance->check_out !== null;
        $this->guardDecidedOvertimeNotModified($attendance, $isCorrection);

        $checkOutLocal = Carbon::parse($data['check_out']);
        $checkOut = $checkOutLocal->clone()->utc();

        $netWorkedMinutes = $this->calculateNetWorkedMinutes(
            Carbon::parse($attendance->check_in),
            $attendance->lunch_start ? Carbon::parse($attendance->lunch_start) : null,
            $attendance->lunch_end ? Carbon::parse($attendance->lunch_end) : null,
            $checkOut,
        );
        $overtimeMinutes = $this->calculateOvertimeMinutes($attendance, $checkOut, $checkOutLocal);

        return DB::transaction(function () use ($attendance, $data, $checkOut, $netWorkedMinutes, $overtimeMinutes) {
            $attendance->auditReason = $data['reason'] ?? null;
            $attendance->update([
                'check_out' => $checkOut,
                'net_worked_minutes' => $netWorkedMinutes,
                'overtime_minutes' => $overtimeMinutes,
            ]);

            $this->syncAutoOvertimeMovement($attendance, $overtimeMinutes);

            return $attendance->load('employee');
        });
    }

    /**
     * Throw a 422 if this is a check-out correction and the overtime decision
     * for this attendance was already recorded (Attendance.overtime_authorized_at
     * is set by RecordOvertimeDecisionAction, on either authorize or reject) —
     * there is no reopen flow, so a settled overtime amount is never silently
     * changed underneath it.
     *
     * @throws ValidationException
     */
    private function guardDecidedOvertimeNotModified(Attendance $attendance, bool $isCorrection): void
    {
        if ($isCorrection && $attendance->overtime_authorized_at !== null) {
            throw ValidationException::withMessages([
                'check_out' => 'No se puede corregir la salida: las horas extra de este día ya fueron decididas.',
            ]);
        }
    }

    /**
     * Create, update, or remove the auto EARNED OvertimeBankMovement so it
     * always matches the just-recalculated overtime_minutes. Only reached
     * when the overtime decision hasn't been recorded yet —
     * guardDecidedOvertimeNotModified() already rejected that case.
     */
    private function syncAutoOvertimeMovement(Attendance $attendance, int $overtimeMinutes): void
    {
        $existingAutoMovement = $this->existingAutoOvertimeMovement($attendance);

        if ($existingAutoMovement) {
            if ($overtimeMinutes > 0) {
                $existingAutoMovement->update(['minutes' => $overtimeMinutes]);
            } else {
                $existingAutoMovement->delete();
            }

            return;
        }

        if ($overtimeMinutes > 0) {
            OvertimeBankMovement::create([
                'employee_id' => $attendance->employee_id,
                'attendance_id' => $attendance->id,
                'date' => $attendance->date,
                'movement_type' => OvertimeMovementType::EARNED,
                'origin' => OvertimeOrigin::AUTO,
                'minutes' => $overtimeMinutes,
            ]);
        }
    }

    /**
     * The existing auto-generated (origin=AUTO) EARNED overtime movement for
     * this attendance, if any — there is at most one per attendance. Filtering
     * by movement_type too (not just origin) matters because
     * CreateOvertimePaidMovementsAction also creates an origin=AUTO row for the
     * same attendance at payroll close time, but with movement_type=PAID —
     * without this filter, a correction after the period is reopened could
     * match and mutate that PAID row instead of the EARNED one.
     */
    private function existingAutoOvertimeMovement(Attendance $attendance): ?OvertimeBankMovement
    {
        return OvertimeBankMovement::where('attendance_id', $attendance->id)
            ->where('origin', OvertimeOrigin::AUTO)
            ->where('movement_type', OvertimeMovementType::EARNED)
            ->first();
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
                'check_out' => 'El empleado no tiene check-in registrado para este día.',
            ]);
        }
    }

    // calculateNetWorkedMinutes() provided by ResolvesEffectiveScheduleDay trait

    /**
     * Calculate overtime in whole minutes:
     *   overtime = max(0, check_out − expected_end) in minutes (floor)
     *
     * expected_end is stored as a local time-only value (e.g. "22:00:00").
     * We anchor it to the attendance START date using the check-out's timezone
     * offset to get the correct UTC timestamp for comparison.
     *
     * Returns 0 when:
     *   - The schedule cannot be resolved (non-blocking)
     *   - The employee left before or exactly at expected_end
     */
    private function calculateOvertimeMinutes(Attendance $attendance, Carbon $checkOut, Carbon $checkOutLocal): int
    {
        $scheduleDay = $this->resolveEffectiveScheduleDay($attendance);

        if (! $scheduleDay || ! $scheduleDay->expected_end) {
            return 0;
        }

        // Anchor expected_end to the attendance START date (local) using the
        // checkout's timezone offset, so the comparison is timezone-correct.
        $startDate = $attendance->date->toDateString();
        $timeStr = Carbon::parse($scheduleDay->expected_end)->format('H:i:s');
        $expectedEnd = Carbon::parse("{$startDate} {$timeStr}", $checkOutLocal->timezone);

        // Cross-midnight shift: expected_end (local) < expected_start (local)
        // means the shift ends on the next local calendar day.
        if (
            $scheduleDay->expected_start
            && $scheduleDay->expected_end < $scheduleDay->expected_start
        ) {
            $expectedEnd->addDay();
        }

        $overtimeSeconds = max(0, $checkOut->timestamp - $expectedEnd->timestamp);

        return (int) floor($overtimeSeconds / 60);
    }
}
