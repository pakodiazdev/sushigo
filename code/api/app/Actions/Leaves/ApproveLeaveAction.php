<?php

namespace App\Actions\Leaves;

use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Models\Attendance;
use App\Models\Leave;
use Carbon\CarbonPeriod;
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

    /**
     * @throws ValidationException
     */
    private function guardIsPending(Leave $leave): void
    {
        if ($leave->status !== LeaveStatus::PENDING) {
            throw ValidationException::withMessages([
                'status' => 'Solo se pueden aprobar solicitudes con estado PENDING.',
            ]);
        }
    }

    /**
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
     * @throws ValidationException
     */
    private function guardNoOverlappingApprovedLeave(int $employeeId, string $startDate, string $endDate, int $excludeLeaveId): void
    {
        $overlaps = Leave::where('employee_id', $employeeId)
            ->where('status', LeaveStatus::APPROVED)
            ->where('id', '!=', $excludeLeaveId)
            ->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate)
            ->lockForUpdate()
            ->exists();

        if ($overlaps) {
            throw ValidationException::withMessages([
                'start_date' => 'El empleado ya tiene una ausencia aprobada que se traslapa con las fechas indicadas.',
            ]);
        }
    }

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
}
