<?php

namespace App\Actions\VacationRequests\Concerns;

use App\Enums\DayStatus;
use App\Enums\VacationRequestStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\VacationEntitlement;
use App\Models\VacationRequest;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Validation\ValidationException;

trait VacationRequestGuards
{
    /**
     * Throw 422 if the vacation request is not in PENDING status.
     *
     * @throws ValidationException
     */
    private function guardIsPending(VacationRequest $vacationRequest): void
    {
        if ($vacationRequest->status !== VacationRequestStatus::PENDING) {
            throw ValidationException::withMessages([
                'status' => 'Solo se pueden procesar solicitudes con estado PENDING.',
            ]);
        }
    }

    /**
     * Throw 422 if an approved vacation request already covers any day in the given range.
     *
     * @throws ValidationException
     */
    private function guardNoOverlappingApprovedVacation(
        int $employeeId,
        string $startDate,
        string $endDate,
        ?int $excludeVacationRequestId = null
    ): void {
        $query = VacationRequest::where('employee_id', $employeeId)
            ->where('status', VacationRequestStatus::APPROVED)
            ->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate);

        if ($excludeVacationRequestId !== null) {
            $query->where('id', '!=', $excludeVacationRequestId);
        }

        if ($query->lockForUpdate()->exists()) {
            throw ValidationException::withMessages([
                'start_date' => 'El empleado ya tiene vacaciones aprobadas que se traslapan con las fechas indicadas.',
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
     * Throw 422 if the entitlement does not have enough remaining days.
     *
     * @throws ValidationException
     */
    private function guardSufficientBalance(VacationEntitlement $entitlement, int $daysCount): void
    {
        if ($entitlement->remainingDays() < $daysCount) {
            throw ValidationException::withMessages([
                'start_date' => 'El empleado no tiene saldo de vacaciones suficiente para las fechas indicadas.',
            ]);
        }
    }

    /**
     * Resolve the employee's VacationEntitlement for the calendar year of the given start date.
     *
     * @throws ValidationException
     */
    private function resolveEntitlementForYear(Employee $employee, string $startDate): VacationEntitlement
    {
        $entitlement = VacationEntitlement::where('employee_id', $employee->id)
            ->where('year', Carbon::parse($startDate)->year)
            ->first();

        if (! $entitlement) {
            throw ValidationException::withMessages([
                'employee_id' => 'El empleado no tiene una asignación de vacaciones para el año de la fecha indicada.',
            ]);
        }

        return $entitlement;
    }

    /**
     * Number of calendar days covered by the range, inclusive of both ends.
     */
    private function computeDaysCount(string $startDate, string $endDate): int
    {
        return Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)) + 1;
    }

    /**
     * Create Attendance records for each day in the range with day_status = VACATION.
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
                    'day_status' => DayStatus::VACATION,
                ]
            );
        }
    }
}
