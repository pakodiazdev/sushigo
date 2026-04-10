<?php

namespace App\Actions\Attendances;

use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\Leave;
use App\Models\ScheduleDay;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Register an employee's check-in for the day.
 *
 * This action:
 *   1. Resolves the employee from their public_id
 *   2. Guards against duplicate attendance for the same date
 *   3. Looks up the active employment period and schedule for the check-in date
 *   4. Retrieves the ScheduleDay configuration for the day of week
 *   5. Calculates entry_late_seconds = max(0, checkIn − expectedStart) in seconds
 *   6. Persists an Attendance record with day_status = WORKED
 *
 * All business rule violations are surfaced as 422 ValidationException.
 *
 * @see AP-013, RF-11, RF-13, RF-15a
 */
class RegisterCheckInAction
{
    /**
     * @param  array{employee_id: string, check_in: string}  $data
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
        $this->guardNoDuplicateAttendance($employee->id, $date);

        $period = $this->resolveActiveEmploymentPeriod($employee->id, $date);
        $schedule = $this->resolveActiveSchedule($period->id, $date);
        $scheduleDay = $this->resolveScheduleDay($schedule, $dayOfWeekIso);

        $lateSeconds = $this->calculateLateSeconds($checkInLocal, $scheduleDay->expected_start);

        $attendance = Attendance::create([
            'employee_id' => $employee->id,
            'date' => $date,
            'check_in' => $checkIn,
            'entry_late_seconds' => $lateSeconds,
            'day_status' => DayStatus::WORKED,
        ]);

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
                'check_in' => 'El empleado ya tiene asistencia registrada para este día.',
            ]);
        }
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
     * Reject check-in times in the future (allow up to 5 minutes of clock skew).
     *
     * @throws ValidationException
     */
    private function guardNotInFuture(Carbon $checkInLocal): void
    {
        $nowLocal = Carbon::now($checkInLocal->timezone);
        $toleranceMinutes = 5;

        if ($checkInLocal->isAfter($nowLocal->copy()->addMinutes($toleranceMinutes))) {
            throw ValidationException::withMessages([
                'check_in' => 'La hora de entrada no puede ser en el futuro.',
            ]);
        }
    }

    /**     * Return the active employment period for the employee on the given date.
     *
     * @throws ValidationException
     */
    private function resolveActiveEmploymentPeriod(int $employeeId, string $date): EmploymentPeriod
    {
        $period = EmploymentPeriod::where('employee_id', $employeeId)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $date);
            })
            ->first();

        if (! $period) {
            throw ValidationException::withMessages([
                'employee_id' => 'El empleado no tiene un período de empleo activo para esta fecha.',
            ]);
        }

        return $period;
    }

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
     * Return the ScheduleDay config for the ISO day of week (1=Mon … 7=Sun).
     *
     * @throws ValidationException
     */
    private function resolveScheduleDay(EmployeeSchedule $schedule, int $dayOfWeekIso): ScheduleDay
    {
        $scheduleDay = $schedule->dayConfig($dayOfWeekIso);

        if (! $scheduleDay) {
            throw ValidationException::withMessages([
                'check_in' => 'El horario del empleado no tiene configuración para este día de la semana.',
            ]);
        }

        if ($scheduleDay->isDayOff()) {
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
