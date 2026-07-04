<?php

namespace App\Services\EmployeeRequests;

use App\Actions\Leaves\Concerns\LeaveGuards;
use App\Enums\EmployeeRequestType;
use App\Enums\LeaveStatus;
use App\Models\EmployeeRequest;
use App\Models\Leave;
use App\Models\LeaveType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Materializes an approved LEAVE employee request into a Leave record.
 *
 * - Runs the same guards as the direct/approve flows, evaluated at approval
 *   time (not request time), since the situation may have changed since the
 *   request was submitted.
 * - Creates Attendance LEAVE records unless the leave is SCHEDULED (partial)
 *   — see LeaveGuards::shouldCreateAttendanceRecords.
 */
class LeaveRequestHandler implements RequestHandler
{
    use LeaveGuards;

    /**
     * @throws ValidationException
     */
    public function handle(EmployeeRequest $employeeRequest): Model
    {
        if ($employeeRequest->type !== EmployeeRequestType::LEAVE) {
            throw ValidationException::withMessages([
                'type' => 'Tipo de solicitud no soportado por LeaveRequestHandler.',
            ]);
        }

        $approvedBy = $employeeRequest->approved_by;
        if ($approvedBy === null) {
            throw ValidationException::withMessages([
                'approved_by' => 'La solicitud debe estar aprobada antes de crear la entidad concreta.',
            ]);
        }

        $payload = $employeeRequest->payload;
        $employee = $employeeRequest->employee;
        $leaveType = LeaveType::findOrFail($payload['leave_type_id']);

        $dates = $this->normalizeDates($payload['dates']);
        $createsAttendance = $this->shouldCreateAttendanceRecords($payload['time_mode'] ?? null);

        $this->guardNoOverlappingApprovedLeave($employee->id, $dates);

        if ($createsAttendance) {
            $this->guardNoExistingWorkedAttendance($employee->id, $dates);
        }

        $attributes = $this->buildLeaveAttributes(
            $payload,
            $dates,
            $employee,
            $leaveType,
            null,
            $employeeRequest->requested_by,
            [
                'status' => LeaveStatus::APPROVED,
                'approved_by' => $approvedBy,
                'approved_at' => $employeeRequest->approved_at ?? now(),
                'notes' => $employeeRequest->notes,
            ]
        );

        $leave = Leave::create($attributes);
        $this->persistLeaveDates($leave, $dates);

        if ($createsAttendance) {
            $this->createAttendanceRecords($employee->id, $dates);
        }

        return $leave;
    }
}
