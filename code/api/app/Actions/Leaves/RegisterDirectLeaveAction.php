<?php

namespace App\Actions\Leaves;

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

/**
 * Register a direct (immediately approved) leave for an employee.
 *
 * - Sets status = APPROVED immediately (no PENDING step).
 * - Creates or updates Attendance records for each date in the range
 *   with day_status = LEAVE.
 * - Computes actual_duration_minutes for PROPORTIONAL_HOURS leaves when
 *   both actual times are provided.
 *
 * @see RF-25, RF-25a, RF-25d
 */
class RegisterDirectLeaveAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(array $data, int $requestedById): Leave
    {
        $employee = Employee::where('public_id', $data['employee_id'])->firstOrFail();
        $leaveType = LeaveType::findOrFail($data['leave_type_id']);

        $this->guardNoOverlappingApprovedLeave($employee->id, $data['start_date'], $data['end_date']);

        $actualDurationMinutes = $this->computeActualDuration(
            $data['actual_start_time'] ?? null,
            $data['actual_end_time'] ?? null
        );

        $leave = Leave::create([
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
            'status' => LeaveStatus::APPROVED,
            'requested_by' => $requestedById,
            'approved_by' => $requestedById,
            'approved_at' => now(),
            'notes' => $data['notes'] ?? null,
        ]);

        $this->createAttendanceRecords($employee->id, $data['start_date'], $data['end_date']);

        return $leave->load(['employee', 'leaveType', 'requestedBy', 'approvedBy']);
    }

    /**
     * Throw 422 if an approved leave already covers any day in the given range.
     *
     * @throws ValidationException
     */
    private function guardNoOverlappingApprovedLeave(int $employeeId, string $startDate, string $endDate): void
    {
        $overlaps = Leave::where('employee_id', $employeeId)
            ->where('status', LeaveStatus::APPROVED)
            ->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate)
            ->exists();

        if ($overlaps) {
            throw ValidationException::withMessages([
                'start_date' => 'El empleado ya tiene una ausencia aprobada que se traslapa con las fechas indicadas.',
            ]);
        }
    }

    /**
     * Create or update Attendance records for each day in the range,
     * setting day_status = LEAVE.
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

        return (int) $start->diffInMinutes($end);
    }
}
