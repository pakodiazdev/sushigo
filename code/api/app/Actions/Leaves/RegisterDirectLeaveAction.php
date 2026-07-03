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
 * - Creates or updates Attendance records for each date in the range with
 *   day_status = LEAVE, unless the leave is SCHEDULED (partial) — the
 *   employee is still expected to check in/out normally that day, so the
 *   worked-attendance guard is skipped too (express "leave early" flow).
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

        $createsAttendance = $this->shouldCreateAttendanceRecords($data['time_mode'] ?? null);

        $leave = DB::transaction(function () use ($data, $employee, $attributes, $createsAttendance) {
            $this->guardNoOverlappingApprovedLeave($employee->id, $data['start_date'], $data['end_date']);

            if ($createsAttendance) {
                $this->guardNoExistingWorkedAttendance($employee->id, $data['start_date'], $data['end_date']);
            }

            $attributes['approved_at'] = now();
            $leave = Leave::create($attributes);

            if ($createsAttendance) {
                $this->createAttendanceRecords($employee->id, $data['start_date'], $data['end_date']);
            }

            return $leave;
        });

        return $leave->load(['employee', 'leaveType', 'requestedBy', 'approvedBy']);
    }
}
