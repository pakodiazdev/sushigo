<?php

namespace App\Actions\Attendances;

use App\Actions\Attendances\Concerns\ResolvesEffectiveScheduleDay;
use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Enums\VacationRequestStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Leave;
use App\Models\NegotiatedExtraDay;
use App\Models\ScheduleDay;
use App\Models\ScheduleDayOverride;
use App\Models\VacationRequest;
use App\Support\Clock\ApplicationClock;
use App\Support\Traits\ResolvesActiveEmploymentPeriod;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Register an employee's check-in for the day.
 *
 * This action:
 *   1. Resolves the employee from their public_id
 *   2. Guards against duplicate attendance for the same date
 *   3. Looks up the active employment period and schedule for the check-in date
 *   4. Retrieves the effective ScheduleDay (or ScheduleDayOverride) for the day of week
 *   5. Calculates entry_late_seconds = max(0, checkIn − expectedStart) in seconds
 *   6. Persists an Attendance record with day_status = WORKED
 *   7. If correcting a check_in on an already-completed day (check_out already
 *      set), recalculates net_worked_minutes against the NEW check_in — otherwise
 *      it would silently keep reflecting the old, now-incorrect worked span
 *
 * All business rule violations are surfaced as 422 ValidationException.
 *
 * @see AP-013, RF-11, RF-13, RF-15a
 */
class RegisterCheckInAction
{
    use ResolvesActiveEmploymentPeriod;
    use ResolvesEffectiveScheduleDay;

    public function __construct(
        private readonly ApplicationClock $clock
    ) {}

    /**
     * @param  array{employee_id: string, check_in: string, reason?: string}  $data
     *
     * @throws ValidationException
     */
    public function __invoke(array $data): Attendance
    {
        $employee = Employee::where('public_id', $data['employee_id'])->firstOrFail();

        // Parse keeping the original timezone offset to derive the employee's
        // local date and day-of-week.  Only then convert to UTC for storage
        // and late-seconds calculation.  This prevents cross-midnight UTC bugs
        // where a late-night local check-in falls on the next UTC day.
        $checkInLocal = Carbon::parse($data['check_in']);

        // Reject future check-ins (allow up to 5 minutes of clock skew)
        $this->guardNotInFuture($checkInLocal);

        $date = $checkInLocal->toDateString();
        $dayOfWeekIso = $checkInLocal->dayOfWeekIso;
        $checkIn = $checkInLocal->clone()->utc();

        $this->guardNoApprovedLeave($employee->id, $date);
        $this->guardNoApprovedVacation($employee->id, $date);

        $hasApprovedExtraDay = NegotiatedExtraDay::where('employee_id', $employee->id)
            ->where('date', $date)
            ->where('status', NegotiatedExtraDay::STATUS_APPROVED)
            ->exists();

        // Guard duplicate attendance, but allow updating an EXTRA attendance that
        // has no check-in yet (created by RegisterNegotiatedExtraDayAction).
        $this->guardNoDuplicateAttendance($employee->id, $date, $hasApprovedExtraDay);

        $period = $this->resolveActiveEmploymentPeriod($employee->id, $date);
        $schedule = $this->resolveActiveSchedule($period->id, $date);

        $scheduleDay = $this->resolveScheduleDay(
            $schedule,
            $dayOfWeekIso,
            $period->id,
            $date,
            $hasApprovedExtraDay,
        );

        $lateSeconds = $scheduleDay->is_day_off
            ? 0
            : $this->calculateLateSeconds($checkInLocal, $scheduleDay->expected_start);

        $dayStatus = $hasApprovedExtraDay && $scheduleDay->is_day_off
            ? DayStatus::EXTRA
            : DayStatus::WORKED;

        $attendanceData = [
            'check_in' => $checkIn,
            'entry_late_seconds' => $lateSeconds,
            'day_status' => $dayStatus,
        ];

        $attendance = Attendance::where('employee_id', $employee->id)->where('date', $date)->first();

        if ($attendance) {
            // Correcting check_in on an already-completed day: net_worked_minutes
            // was derived from the OLD check_in at check-out time and must be
            // recalculated against the corrected one, or it silently goes stale.
            if ($attendance->check_out !== null) {
                $attendanceData['net_worked_minutes'] = $this->calculateNetWorkedMinutes(
                    $checkIn,
                    $attendance->lunch_start ? Carbon::parse($attendance->lunch_start) : null,
                    $attendance->lunch_end ? Carbon::parse($attendance->lunch_end) : null,
                    Carbon::parse($attendance->check_out),
                );
            }

            $attendance->auditReason = $data['reason'] ?? null;
            $attendance->fill($attendanceData)->save();
        } else {
            $attendance = new Attendance(array_merge(['employee_id' => $employee->id, 'date' => $date], $attendanceData));
            $attendance->auditReason = $data['reason'] ?? null;
            $attendance->save();
        }

        return $attendance->load('employee');
    }

    /**
     * Throw a 422 if the employee already has an attendance record for this date
     * with no check_in yet and it isn't a pending EXTRA stub (e.g. a Falta/ABSENCE
     * or LEAVE record) — that flow is untouched by this action.
     *
     * When check_in is already set, this is a correction of an already-recorded
     * event: authorization (including the attendances.update permission) was
     * already enforced in CheckInRequest::authorize(), so it's allowed through
     * to the update branch below.
     *
     * When $hasApprovedExtraDay is true, an existing attendance with no check-in
     * (created by RegisterNegotiatedExtraDayAction) is also allowed through.
     *
     * @throws ValidationException
     */
    private function guardNoDuplicateAttendance(int $employeeId, string $date, bool $hasApprovedExtraDay = false): void
    {
        $existing = Attendance::where('employee_id', $employeeId)
            ->where('date', $date)
            ->first();

        if (! $existing) {
            return;
        }

        // Already has a check-in — this is an authorized correction.
        if ($existing->check_in !== null) {
            return;
        }

        // Allow check-in on an EXTRA attendance stub that has no check-in yet.
        if ($hasApprovedExtraDay && $existing->day_status === DayStatus::EXTRA) {
            return;
        }

        throw ValidationException::withMessages([
            'check_in' => 'El empleado ya tiene asistencia registrada para este día.',
        ]);
    }

    /**
     * Throw a 422 if the employee has an approved leave for this date.
     *
     * @throws ValidationException
     */
    private function guardNoApprovedLeave(int $employeeId, string $date): void
    {
        $hasLeave = Leave::where('employee_id', $employeeId)
            ->where('status', LeaveStatus::APPROVED)
            ->forDate($date)
            ->exists();

        if ($hasLeave) {
            throw ValidationException::withMessages([
                'check_in' => 'El empleado tiene una ausencia aprobada para este día.',
            ]);
        }
    }

    /**
     * Throw a 422 if the employee has an approved vacation request for this date.
     *
     * @throws ValidationException
     */
    private function guardNoApprovedVacation(int $employeeId, string $date): void
    {
        $hasVacation = VacationRequest::where('employee_id', $employeeId)
            ->where('status', VacationRequestStatus::APPROVED)
            ->forDate($date)
            ->exists();

        if ($hasVacation) {
            throw ValidationException::withMessages([
                'check_in' => 'El empleado tiene vacaciones aprobadas para este día.',
            ]);
        }
    }

    /**
     * Reject check-in times in the future (allow up to 5 minutes of clock skew).
     *
     * @throws ValidationException
     */
    private function guardNotInFuture(Carbon $checkInLocal): void
    {
        $nowLocal = $this->clock->nowInBusinessTz()->setTimezone($checkInLocal->timezone);
        $toleranceMinutes = 5;

        if ($checkInLocal->isAfter($nowLocal->copy()->addMinutes($toleranceMinutes))) {
            throw ValidationException::withMessages([
                'check_in' => 'La hora de entrada no puede ser en el futuro.',
            ]);
        }
    }

    // resolveActiveEmploymentPeriod provided by ResolvesActiveEmploymentPeriod trait

    /**
     * Return the EmployeeSchedule effective on the given date for the period.
     *
     * @throws ValidationException
     */
    private function resolveActiveSchedule(int $periodId, string $date): EmployeeSchedule
    {
        $schedule = EmployeeSchedule::effective($date)
            ->where('employment_period_id', $periodId)
            ->first();

        if (! $schedule) {
            throw ValidationException::withMessages([
                'employee_id' => 'El empleado no tiene un horario asignado para esta fecha.',
            ]);
        }

        return $schedule;
    }

    /**
     * Return the effective schedule config for the ISO day of week (1=Mon … 7=Sun).
     *
     * A ScheduleDayOverride active on $date takes full precedence over the base
     * ScheduleDay. This allows managers to mark a normally-off day as workable
     * (or vice-versa) for a specific date range without changing the base schedule.
     *
     * When $allowDayOff is true (there is an approved NegotiatedExtraDay), the
     * day-off guard is skipped and the rest-day config is returned so the caller
     * can derive the correct DayStatus::EXTRA.
     *
     * @throws ValidationException
     */
    private function resolveScheduleDay(
        EmployeeSchedule $schedule,
        int $dayOfWeekIso,
        int $periodId,
        string $date,
        bool $allowDayOff = false,
    ): ScheduleDay|ScheduleDayOverride {
        // Override takes precedence — check it first.
        $override = ScheduleDayOverride::effective($date)
            ->where('employment_period_id', $periodId)
            ->where('day_of_week', $dayOfWeekIso)
            ->first();

        if ($override) {
            if ($override->is_day_off && ! $allowDayOff) {
                throw ValidationException::withMessages([
                    'check_in' => 'Este día está marcado como descanso en el horario del empleado.',
                ]);
            }

            return $override;
        }

        // Fall back to the base schedule day.
        $scheduleDay = $schedule->dayConfig($dayOfWeekIso);

        if (! $scheduleDay) {
            throw ValidationException::withMessages([
                'check_in' => 'El horario del empleado no tiene configuración para este día de la semana.',
            ]);
        }

        if ($scheduleDay->isDayOff() && ! $allowDayOff) {
            throw ValidationException::withMessages([
                'check_in' => 'Este día está marcado como descanso en el horario del empleado.',
            ]);
        }

        return $scheduleDay;
    }

    /**
     * Calculate seconds late = max(0, checkIn − expectedStart).
     *
     * expected_start is a time-only value stored in local time (e.g. "09:00:00").
     * We anchor it to the check-in's local date and timezone to get a correct
     * comparable timestamp, avoiding UTC-offset errors.
     *
     * If the employee arrives before the expected time, returns 0 (no tardiness).
     */
    private function calculateLateSeconds(Carbon $checkInLocal, mixed $expectedStart): int
    {
        $date = $checkInLocal->toDateString();
        $timeStr = Carbon::parse($expectedStart)->format('H:i:s');
        $expected = Carbon::parse("{$date} {$timeStr}", $checkInLocal->timezone);

        // Night-shift guard: if the expected time lands more than 12 h after
        // check-in it was anchored to the wrong local day — step back one day.
        if ($expected->timestamp - $checkInLocal->timestamp > 12 * 3600) {
            $expected->subDay();
        }

        return (int) max(0, $checkInLocal->timestamp - $expected->timestamp);
    }
}
