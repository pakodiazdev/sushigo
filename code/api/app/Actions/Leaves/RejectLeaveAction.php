<?php

namespace App\Actions\Leaves;

use App\Actions\Leaves\Concerns\LeaveGuards;
use App\Enums\LeaveStatus;
use App\Models\Leave;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reject a PENDING leave request.
 *
 * - Sets status = REJECTED, approved_by, approved_at.
 * - No attendance records are created or modified.
 *
 * @see RF-25, RF-28
 */
class RejectLeaveAction
{
    use LeaveGuards;

    /**
     * @throws ValidationException
     */
    public function __invoke(Leave $leave, int $rejectedById): Leave
    {
        $leave = DB::transaction(function () use ($leave, $rejectedById) {
            $leave = Leave::lockForUpdate()->findOrFail($leave->id);

            $this->guardIsPending($leave);

            $leave->update([
                'status' => LeaveStatus::REJECTED,
                'approved_by' => $rejectedById,
                'approved_at' => now(),
            ]);

            return $leave;
        });

        return $leave->load(['employee', 'leaveType', 'requestedBy', 'approvedBy']);
    }
}
