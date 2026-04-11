<?php

namespace App\Actions\Leaves;

use App\Actions\Leaves\Concerns\LeaveGuards;
use App\Enums\LeaveStatus;
use App\Models\Leave;
use Illuminate\Support\Facades\DB;

/**
 * Register a leave REQUEST (status = PENDING).
 *
 * Unlike RegisterDirectLeaveAction, this does NOT create Attendance
 * records — those are created only when the request is approved.
 *
 * @see RF-25, RF-28
 */
class RegisterLeaveRequestAction
{
    use LeaveGuards;

    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(array $data, int $requestedById): Leave
    {
        [$employee, $leaveType, $actualDurationMinutes] = $this->resolveLeaveContext($data);

        $attributes = $this->buildLeaveAttributes($data, $employee, $leaveType, $actualDurationMinutes, $requestedById, [
            'status' => LeaveStatus::PENDING,
            'approved_by' => null,
            'approved_at' => null,
        ]);

        $leave = DB::transaction(function () use ($data, $employee, $attributes) {
            $this->guardNoOverlappingApprovedLeave($employee->id, $data['start_date'], $data['end_date']);

            return Leave::create($attributes);
        });

        return $leave->load(['employee', 'leaveType', 'requestedBy', 'approvedBy']);
    }
}
