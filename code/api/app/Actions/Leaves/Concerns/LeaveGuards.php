<?php

namespace App\Actions\Leaves\Concerns;

use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Models\Attendance;
use App\Models\Leave;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Validation\ValidationException;

trait LeaveGuards
{
    /**
     * Throw 422 if an approved leave already covers any day in the given range.
     *
     * @throws ValidationException
     */
    private function guardNoOverlappingApprovedLeave(
        int $employeeId,
        string $startDate,
        string $endDate,
        ?int $excludeLeaveId = null
    ): void {
        $query = Leave::where('employee_id', $employeeId)
            ->where('status', LeaveStatus::APPROVED)
            ->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate);

        if ($excludeLeaveId !== null) {
            $query->where('id', '!=', $excludeLeaveId);
        }

        if ($query->lockForUpdate()->exists()) {
            throw ValidationException::withMessages([
                'start_date' => 'El empleado ya tiene una ausencia aprobada que se traslapa con las fechas indicadas.',
            ]);
        }
    }

    /**
     * Throw 422 if any date in the range already has a WORKED attendance record.
     *
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
     * Create Attendance records for each day in the range with day_status = LEAVE.
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

        return (int) $start->diffInMinutes($end, absolute: true);
    }
}
