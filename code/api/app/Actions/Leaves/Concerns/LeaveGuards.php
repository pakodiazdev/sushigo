<?php

namespace App\Actions\Leaves\Concerns;

use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Enums\LeaveTimeMode;
use App\Enums\RestDayFactor;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

trait LeaveGuards
{
    /**
     * Normalizes a raw list of date strings: sorted ascending, deduplicated,
     * reindexed. Every entry point (direct registration, employee-request
     * handler) should run its incoming dates through this before use.
     *
     * @param  array<int, string>  $dates
     * @return array<int, string>
     */
    private function normalizeDates(array $dates): array
    {
        $unique = array_values(array_unique($dates));
        sort($unique);

        return $unique;
    }

    /**
     * Throw 422 if an approved leave already covers any of the given dates.
     *
     * @param  array<int, string>  $dates
     *
     * @throws ValidationException
     */
    private function guardNoOverlappingApprovedLeave(
        int $employeeId,
        array $dates,
        ?int $excludeLeaveId = null
    ): void {
        $query = Leave::where('employee_id', $employeeId)
            ->where('status', LeaveStatus::APPROVED)
            ->whereHas('dates', function (Builder $q) use ($dates) {
                $q->whereIn('date', $dates);
            });

        if ($excludeLeaveId !== null) {
            $query->where('id', '!=', $excludeLeaveId);
        }

        if ($query->lockForUpdate()->exists()) {
            throw ValidationException::withMessages([
                'dates' => 'El empleado ya tiene una ausencia aprobada que se traslapa con las fechas indicadas.',
            ]);
        }
    }

    /**
     * Throw 422 if any of the given dates already has a WORKED attendance record.
     *
     * @param  array<int, string>  $dates
     *
     * @throws ValidationException
     */
    private function guardNoExistingWorkedAttendance(int $employeeId, array $dates): void
    {
        $exists = Attendance::where('employee_id', $employeeId)
            ->where('day_status', DayStatus::WORKED)
            ->whereIn('date', $dates)
            ->lockForUpdate()
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'dates' => 'El empleado ya tiene asistencia trabajada registrada para alguno de los días indicados.',
            ]);
        }
    }

    /**
     * Whether a leave with the given time mode should produce Attendance records.
     *
     * SCHEDULED (partial) leaves never touch Attendance — the employee is still
     * expected to check in/out normally that day, and the context is exposed via
     * CloseDayAction and the Today view instead. Full-day (null) and OPEN_ENDED
     * leaves behave like a whole-day absence, so they do create the LEAVE record.
     */
    private function shouldCreateAttendanceRecords(?string $timeMode): bool
    {
        return $timeMode !== LeaveTimeMode::SCHEDULED->value;
    }

    /**
     * Create Attendance records for each selected date with day_status = LEAVE.
     *
     * @param  array<int, string>  $dates
     */
    private function createAttendanceRecords(int $employeeId, array $dates): void
    {
        foreach ($dates as $date) {
            Attendance::updateOrCreate(
                [
                    'employee_id' => $employeeId,
                    'date' => $date,
                ],
                [
                    'day_status' => DayStatus::LEAVE,
                ]
            );
        }
    }

    /**
     * Persist the exact set of days a Leave covers.
     *
     * @param  array<int, string>  $dates
     */
    private function persistLeaveDates(Leave $leave, array $dates): void
    {
        $now = $this->clock->nowUtc();

        $leave->dates()->insert(array_map(fn (string $date) => [
            'leave_id' => $leave->id,
            'date' => $date,
            'created_at' => $now,
            'updated_at' => $now,
        ], $dates));
    }

    /**
     * Compute actual duration in minutes from start and end time strings (H:i format).
     */
    private function computeActualDuration(?string $startTime, ?string $endTime): ?int
    {
        if (! $startTime || ! $endTime) {
            return null;
        }

        $start = Carbon::parse($startTime);
        $end = Carbon::parse($endTime);

        return (int) $start->diffInMinutes($end, absolute: true);
    }

    /**
     * Build the common Leave attributes array from validated request data.
     *
     * start_date/end_date are derived as the MIN/MAX of the given dates —
     * kept for range-based history filtering and display, but the exact
     * selected days live in the leave_dates table (see persistLeaveDates).
     *
     * @param  array<string, mixed>  $data
     * @param  array<int, string>  $dates  Normalized (sorted, deduplicated)
     * @param  array<string, mixed>  $overrides  Fields that differ per action (status, approved_by, approved_at)
     * @return array<string, mixed>
     */
    private function buildLeaveAttributes(
        array $data,
        array $dates,
        Employee $employee,
        LeaveType $leaveType,
        ?int $actualDurationMinutes,
        int $requestedById,
        array $overrides
    ): array {
        return array_merge([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => $dates[0],
            'end_date' => $dates[count($dates) - 1],
            'pay_percentage' => $data['pay_percentage'] ?? null,
            'rest_day_factor' => isset($data['rest_day_factor'])
                ? RestDayFactor::from($data['rest_day_factor'])
                : null,
            'time_mode' => isset($data['time_mode'])
                ? LeaveTimeMode::from($data['time_mode'])
                : null,
            'scheduled_start_time' => $data['scheduled_start_time'] ?? null,
            'scheduled_end_time' => $data['scheduled_end_time'] ?? null,
            'actual_start_time' => $data['actual_start_time'] ?? null,
            'actual_end_time' => $data['actual_end_time'] ?? null,
            'actual_duration_minutes' => $actualDurationMinutes,
            'requested_by' => $requestedById,
            'notes' => $data['notes'] ?? null,
        ], $overrides);
    }

    /**
     * Resolve Employee and LeaveType from validated request data.
     *
     * @param  array<string, mixed>  $data
     * @return array{Employee, LeaveType, int|null}
     */
    private function resolveLeaveContext(array $data): array
    {
        $employee = Employee::where('public_id', $data['employee_id'])->firstOrFail();
        $leaveType = LeaveType::findOrFail($data['leave_type_id']);

        $actualDurationMinutes = $this->computeActualDuration(
            $data['actual_start_time'] ?? null,
            $data['actual_end_time'] ?? null
        );

        return [$employee, $leaveType, $actualDurationMinutes];
    }
}
