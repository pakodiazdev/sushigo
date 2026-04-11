<?php

namespace App\Actions\Leaves;

use App\Actions\Leaves\Concerns\LeaveGuards;
use App\Enums\LeaveStatus;
use App\Enums\LeaveTimeMode;
use App\Enums\RestDayFactor;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveType;
use Illuminate\Support\Facades\DB;

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
    use LeaveGuards;

    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(array $data, int $requestedById): Leave
    {
        $employee = Employee::where('public_id', $data['employee_id'])->firstOrFail();
        $leaveType = LeaveType::findOrFail($data['leave_type_id']);

        $actualDurationMinutes = $this->computeActualDuration(
            $data['actual_start_time'] ?? null,
            $data['actual_end_time'] ?? null
        );

        $leave = DB::transaction(function () use ($data, $employee, $leaveType, $actualDurationMinutes, $requestedById) {
            $this->guardNoOverlappingApprovedLeave($employee->id, $data['start_date'], $data['end_date']);
            $this->guardNoExistingWorkedAttendance($employee->id, $data['start_date'], $data['end_date']);
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

            return $leave;
        });

        return $leave->load(['employee', 'leaveType', 'requestedBy', 'approvedBy']);
    }
}
