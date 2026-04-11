<?php

namespace App\Actions\Leaves;

use App\Actions\Leaves\Concerns\LeaveGuards;
use App\Enums\LeaveStatus;
use App\Models\Leave;
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
        [$employee, $leaveType, $actualDurationMinutes] = $this->resolveLeaveContext($data);

        $attributes = $this->buildLeaveAttributes($data, $employee, $leaveType, $actualDurationMinutes, $requestedById, [
            'status' => LeaveStatus::APPROVED,
            'approved_by' => $requestedById,
        ]);

        $leave = DB::transaction(function () use ($data, $employee, $attributes) {
            $this->guardNoOverlappingApprovedLeave($employee->id, $data['start_date'], $data['end_date']);
            $this->guardNoExistingWorkedAttendance($employee->id, $data['start_date'], $data['end_date']);

            $attributes['approved_at'] = now();
            $leave = Leave::create($attributes);

            $this->createAttendanceRecords($employee->id, $data['start_date'], $data['end_date']);

            return $leave;
        });

        return $leave->load(['employee', 'leaveType', 'requestedBy', 'approvedBy']);
    }
}
