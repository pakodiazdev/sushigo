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
use Carbon\CarbonPeriod;
use Illuminate\Validation\ValidationException;

trait LeaveGuards
{
    /**
     * Throw 422 if the leave is not in PENDING status.
     *
     * @throws ValidationException
     */
    private function guardIsPending(Leave $leave): void
    {
        if ($leave->status !== LeaveStatus::PENDING) {
            throw ValidationException::withMessages([
                'status' => 'Solo se pueden procesar solicitudes con estado PENDING.',
            ]);
        }
    }

    /**
     * Throw 422 if an approved leave already covers any day in the given range.
     *
     * @throws ValidationException
     */
    private function guardNoOverlappingApprovedLeave(
        int $employeeId,
        string $startDate,
        string $endDate,
        ?int $excludeLeaveId = null
    ): void {
        $query = Leave::where('employee_id', $employeeId)
            ->where('status', LeaveStatus::APPROVED)
            ->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate);

        if ($excludeLeaveId !== null) {
            $query->where('id', '!=', $excludeLeaveId);
        }

        if ($query->lockForUpdate()->exists()) {
            throw ValidationException::withMessages([
                'start_date' => 'El empleado ya tiene una ausencia aprobada que se traslapa con las fechas indicadas.',
            ]);
        }
    }

    /**
     * Throw 422 if any date in the range already has a WORKED attendance record.
     *
     * @throws ValidationException
     */
    private function guardNoExistingWorkedAttendance(int $employeeId, string $startDate, string $endDate): void
    {
        $exists = Attendance::where('employee_id', $employeeId)
            ->where('day_status', DayStatus::WORKED)
            ->where('date', '>=', $startDate)
            ->where('date', '<=', $endDate)
            ->lockForUpdate()
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'start_date' => 'El empleado ya tiene asistencia trabajada registrada para alguno de los días indicados.',
            ]);
        }
    }

    /**
     * Create Attendance records for each day in the range with day_status = LEAVE.
     */
    private function createAttendanceRecords(int $employeeId, string $startDate, string $endDate): void
    {
        $period = CarbonPeriod::create($startDate, $endDate);

        foreach ($period as $day) {
            Attendance::updateOrCreate(
                [
                    'employee_id' => $employeeId,
                    'date' => $day->toDateString(),
                ],
                [
                    'day_status' => DayStatus::LEAVE,
                ]
            );
        }
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
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $overrides  Fields that differ per action (status, approved_by, approved_at)
     * @return array<string, mixed>
     */
    private function buildLeaveAttributes(
        array $data,
        Employee $employee,
        LeaveType $leaveType,
        ?int $actualDurationMinutes,
        int $requestedById,
        array $overrides
    ): array {
        return array_merge([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
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
