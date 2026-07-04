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
     * @param  array<string, mixed>  $data  Must include 'dates' (array of date strings)
     */
    public function __invoke(array $data, int $requestedById): Leave
    {
        [$employee, $leaveType, $actualDurationMinutes] = $this->resolveLeaveContext($data);
        $dates = $this->normalizeDates($data['dates']);

        $attributes = $this->buildLeaveAttributes($data, $dates, $employee, $leaveType, $actualDurationMinutes, $requestedById, [
            'status' => LeaveStatus::APPROVED,
            'approved_by' => $requestedById,
        ]);

        $createsAttendance = $this->shouldCreateAttendanceRecords($data['time_mode'] ?? null);

        $leave = DB::transaction(function () use ($dates, $employee, $attributes, $createsAttendance) {
            $this->guardNoOverlappingApprovedLeave($employee->id, $dates);

            if ($createsAttendance) {
                $this->guardNoExistingWorkedAttendance($employee->id, $dates);
            }

            $attributes['approved_at'] = now();
            $leave = Leave::create($attributes);
            $this->persistLeaveDates($leave, $dates);

            if ($createsAttendance) {
                $this->createAttendanceRecords($employee->id, $dates);
            }

            return $leave;
        });

        return $leave->load(['employee', 'leaveType', 'requestedBy', 'approvedBy', 'dates']);
    }
}
