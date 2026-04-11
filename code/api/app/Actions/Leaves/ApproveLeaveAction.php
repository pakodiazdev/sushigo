<?php

namespace App\Actions\Leaves;

use App\Actions\Leaves\Concerns\LeaveGuards;
use App\Enums\LeaveStatus;
use App\Models\Leave;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Approve a PENDING leave request.
 *
 * - Sets status = APPROVED, approved_by, approved_at.
 * - Creates/updates Attendance records for each date in range with day_status = LEAVE.
 * - Guards: only PENDING leaves may be approved; no worked attendance overlap.
 *
 * @see RF-25, RF-28
 */
class ApproveLeaveAction
{
    use LeaveGuards;

    /**
     * @throws ValidationException
     */
    public function __invoke(Leave $leave, int $approvedById): Leave
    {
        $leave = DB::transaction(function () use ($leave, $approvedById) {
            $leave = Leave::lockForUpdate()->findOrFail($leave->id);

            $this->guardIsPending($leave);
            $this->guardNoExistingWorkedAttendance(
                $leave->employee_id,
                $leave->start_date->toDateString(),
                $leave->end_date->toDateString()
            );
            $this->guardNoOverlappingApprovedLeave(
                $leave->employee_id,
                $leave->start_date->toDateString(),
                $leave->end_date->toDateString(),
                $leave->id
            );

            $leave->update([
                'status' => LeaveStatus::APPROVED,
                'approved_by' => $approvedById,
                'approved_at' => now(),
            ]);

            $this->createAttendanceRecords(
                $leave->employee_id,
                $leave->start_date->toDateString(),
                $leave->end_date->toDateString()
            );

            return $leave;
        });

        return $leave->load(['employee', 'leaveType', 'requestedBy', 'approvedBy']);
    }
}
