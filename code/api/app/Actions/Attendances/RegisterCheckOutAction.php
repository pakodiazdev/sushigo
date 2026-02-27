<?php

namespace App\Actions\Attendances;

use App\Models\Attendance;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Register an employee's check-out (departure) for the day.
 *
 * This action:
 *   1. Guards that the attendance already has a check_in
 *   2. Guards against duplicate check_out registration
 *   3. Calculates net_worked_minutes:
 *        (check_out − check_in) − actual_lunch_duration_if_both_recorded
 *   4. Calculates overtime_minutes:
 *        max(0, check_out − scheduleDay.expected_end) in whole minutes
 *      If the schedule cannot be resolved, overtime_minutes = 0 (non-blocking)
 *   5. Persists check_out, net_worked_minutes, overtime_minutes
 *
 * All business rule violations are surfaced as 422 ValidationException.
 *
 * @see AP-015, RF-12, RF-14, RF-42
 */
class RegisterCheckOutAction
{
    /**
     * @param  Attendance                $attendance  Already-loaded attendance record
     * @param  array{check_out: string}  $data        Validated request data
     *
     * @throws ValidationException
     */
    public function __invoke(Attendance $attendance, array $data): Attendance
    {
        $this->guardCheckInExists($attendance);
        $this->guardNoDuplicateCheckOut($attendance);

        $checkOut = Carbon::parse($data['check_out'])->utc();

        $netWorkedMinutes = $this->calculateNetWorkedMinutes($attendance, $checkOut);
        $overtimeMinutes  = $this->calculateOvertimeMinutes($attendance, $checkOut);

        $attendance->update([
            'check_out'          => $checkOut,
            'net_worked_minutes' => $netWorkedMinutes,
            'overtime_minutes'   => $overtimeMinutes,
        ]);

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
                'check_out' => 'El empleado no tiene check-in registrado para este día.',
            ]);
        }
    }

    /**
     * Throw a 422 if check_out was already registered for this attendance.
     *
     * @throws ValidationException
     */
    private function guardNoDuplicateCheckOut(Attendance $attendance): void
    {
        if ($attendance->check_out) {
            throw ValidationException::withMessages([
                'check_out' => 'La salida ya fue registrada para este día.',
            ]);
        }
    }

    /**
     * Calculate net worked minutes:
     *   gross = check_out − check_in  (in minutes)
     *   net   = gross − actual_lunch_duration  (only if both lunch_start and lunch_end exist)
     *
     * Returns 0 minimum (cannot be negative).
     */
    private function calculateNetWorkedMinutes(Attendance $attendance, Carbon $checkOut): int
    {
        $checkIn      = Carbon::parse($attendance->check_in);
        $grossMinutes = $checkIn->diffInMinutes($checkOut);

        // Deduct the actual lunch break only when both boundaries were recorded
        if ($attendance->lunch_start && $attendance->lunch_end) {
            $lunchStart    = Carbon::parse($attendance->lunch_start);
            $lunchEnd      = Carbon::parse($attendance->lunch_end);
            $lunchMinutes  = $lunchStart->diffInMinutes($lunchEnd);
            $grossMinutes -= $lunchMinutes;
        }

        return (int) max(0, $grossMinutes);
    }

    /**
     * Calculate overtime in whole minutes:
     *   overtime = max(0, check_out − expected_end) in minutes (floor)
     *
     * Returns 0 when:
     *   - The schedule cannot be resolved (non-blocking)
     *   - The employee left before or exactly at expected_end
     */
    private function calculateOvertimeMinutes(Attendance $attendance, Carbon $checkOut): int
    {
        $scheduleDay = $this->resolveScheduleDay($attendance);

        if (! $scheduleDay || ! $scheduleDay->expected_end) {
            return 0;
        }

        // expected_end is a UTC time-only value — anchor it to the check-in's
        // UTC date (NOT attendance->date, which stores the employee's local date
        // and may differ from the UTC date for cross-midnight shifts).
        // Cross-midnight shift: when expected_end < expected_start (e.g. 19:00→04:00 UTC),
        // the end falls on the next calendar day.
        $expectedEnd = Carbon::parse($scheduleDay->expected_end)
            ->setDateFrom($attendance->check_in);

        if ($scheduleDay->expected_start
            && $scheduleDay->expected_end < $scheduleDay->expected_start) {
            $expectedEnd->addDay();
        }

        $overtimeSeconds = max(0, $checkOut->timestamp - $expectedEnd->timestamp);

        return (int) floor($overtimeSeconds / 60);
    }

    /**
     * Attempt to resolve the ScheduleDay for the attendance's date.
     * Returns null if any step fails (non-blocking — callers default to 0).
     */
    private function resolveScheduleDay(Attendance $attendance): ?ScheduleDay
    {
        $date      = $attendance->date->toDateString();
        $dayOfWeek = $attendance->date->dayOfWeekIso;

        $period = EmploymentPeriod::where('employee_id', $attendance->employee_id)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $date);
            })
            ->first();

        if (! $period) {
            return null;
        }

        $schedule = EmployeeSchedule::effective($date)
            ->where('employment_period_id', $period->id)
            ->first();

        if (! $schedule) {
            return null;
        }

        return $schedule->dayConfig($dayOfWeek);
    }
}
