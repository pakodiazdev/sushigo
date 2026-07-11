<?php

namespace App\Actions\VacationRequests\Concerns;

use App\Enums\DayStatus;
use App\Enums\VacationRequestStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\VacationEntitlement;
use App\Models\VacationRequest;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

trait VacationRequestGuards
{
    /**
     * Normalizes a raw list of date strings: sorted ascending, deduplicated,
     * reindexed.
     *
     * @param  array<int, string>  $dates
     * @return array<int, string>
     */
    private function normalizeDates(array $dates): array
    {
        $unique = array_values(array_unique($dates));
        sort($unique);

        return $unique;
    }

    /**
     * Throw a 422 if the vacation request is not in PENDING status.
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
     * Throw a 422 if an approved vacation request already covers any of the given dates.
     *
     * @param  array<int, string>  $dates
     *
     * @throws ValidationException
     */
    private function guardNoOverlappingApprovedVacation(
        int $employeeId,
        array $dates,
        ?int $excludeVacationRequestId = null
    ): void {
        $query = VacationRequest::where('employee_id', $employeeId)
            ->where('status', VacationRequestStatus::APPROVED)
            ->whereHas('dates', function (Builder $q) use ($dates) {
                $q->whereIn('date', $dates);
            });

        if ($excludeVacationRequestId !== null) {
            $query->where('id', '!=', $excludeVacationRequestId);
        }

        if ($query->lockForUpdate()->exists()) {
            throw ValidationException::withMessages([
                'dates' => 'El empleado ya tiene vacaciones aprobadas que se traslapan con las fechas indicadas.',
            ]);
        }
    }

    /**
     * Throw a 422 if any of the given dates already has a WORKED attendance record.
     *
     * @param  array<int, string>  $dates
     *
     * @throws ValidationException
     */
    private function guardNoExistingWorkedAttendance(int $employeeId, array $dates): void
    {
        $exists = Attendance::where('employee_id', $employeeId)
            ->where('day_status', DayStatus::WORKED)
            ->whereIn('date', $dates)
            ->lockForUpdate()
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'dates' => 'El empleado ya tiene asistencia trabajada registrada para alguno de los días indicados.',
            ]);
        }
    }

    /**
     * Throw a 422 if the entitlement does not have enough remaining days.
     *
     * @throws ValidationException
     */
    private function guardSufficientBalance(VacationEntitlement $entitlement, int $daysCount): void
    {
        if ($entitlement->remainingDays() < $daysCount) {
            throw ValidationException::withMessages([
                'dates' => 'El empleado no tiene saldo de vacaciones suficiente para las fechas indicadas.',
            ]);
        }
    }

    /**
     * Resolve the employee's VacationEntitlement for the calendar year of the given reference date.
     *
     * @throws ValidationException
     */
    private function resolveEntitlementForYear(Employee $employee, string $referenceDate): VacationEntitlement
    {
        $entitlement = VacationEntitlement::where('employee_id', $employee->id)
            ->where('year', Carbon::parse($referenceDate)->year)
            ->first();

        if (! $entitlement) {
            throw ValidationException::withMessages([
                'employee_id' => 'El empleado no tiene una asignación de vacaciones para el año de la fecha indicada.',
            ]);
        }

        return $entitlement;
    }

    /**
     * Create Attendance records for each selected date with day_status = VACATION.
     *
     * @param  array<int, string>  $dates
     */
    private function createAttendanceRecords(int $employeeId, array $dates): void
    {
        foreach ($dates as $date) {
            Attendance::updateOrCreate(
                [
                    'employee_id' => $employeeId,
                    'date' => $date,
                ],
                [
                    'day_status' => DayStatus::VACATION,
                ]
            );
        }
    }

    /**
     * Persist the exact set of days a VacationRequest covers.
     *
     * @param  array<int, string>  $dates
     */
    private function persistVacationRequestDates(VacationRequest $vacationRequest, array $dates): void
    {
        $now = now();

        $vacationRequest->dates()->insert(array_map(fn (string $date) => [
            'vacation_request_id' => $vacationRequest->id,
            'date' => $date,
            'created_at' => $now,
            'updated_at' => $now,
        ], $dates));
    }

    /**
     * Marks a vacation request as approved: increments the entitlement's
     * used_days, creates Attendance VACATION records for each selected date,
     * and sets status/approver. Shared by both the approve endpoint and the
     * auto-approve path taken when an admin/manager registers a request.
     *
     * @param  array<int, string>  $dates
     */
    private function finalizeApproval(VacationRequest $vacationRequest, array $dates, int $approvedById): void
    {
        VacationEntitlement::where('id', $vacationRequest->vacation_entitlement_id)
            ->lockForUpdate()
            ->increment('used_days', $vacationRequest->days_count);

        $vacationRequest->update([
            'status' => VacationRequestStatus::APPROVED,
            'approved_by' => $approvedById,
            'approved_at' => now(),
        ]);

        $this->createAttendanceRecords($vacationRequest->employee_id, $dates);
    }

    /**
     * Creates a VacationRequest directly in APPROVED status: resolves the
     * entitlement, runs all the approval guards, persists the exact dates,
     * deducts the balance and creates Attendance VACATION records.
     *
     * Used both by the direct admin-registration auto-approve path and by
     * VacationRequestHandler when materializing a self-service employee
     * request that a manager just approved.
     *
     * @param  array<int, string>  $dates  Already normalized (sorted, deduplicated)
     *
     * @throws ValidationException
     */
    private function createApprovedVacationRequest(
        Employee $employee,
        array $dates,
        int $requestedById,
        int $approvedById,
        ?string $notes,
        ?Carbon $approvedAt = null
    ): VacationRequest {
        $daysCount = count($dates);

        $entitlement = $this->resolveEntitlementForYear($employee, $dates[0]);
        $this->guardSufficientBalance($entitlement, $daysCount);
        $this->guardNoOverlappingApprovedVacation($employee->id, $dates);
        $this->guardNoExistingWorkedAttendance($employee->id, $dates);

        $vacationRequest = VacationRequest::create([
            'employee_id' => $employee->id,
            'vacation_entitlement_id' => $entitlement->id,
            'start_date' => $dates[0],
            'end_date' => $dates[count($dates) - 1],
            'days_count' => $daysCount,
            'status' => VacationRequestStatus::APPROVED,
            'requested_by' => $requestedById,
            'approved_by' => $approvedById,
            'approved_at' => $approvedAt ?? now(),
            'notes' => $notes,
        ]);

        $this->persistVacationRequestDates($vacationRequest, $dates);

        VacationEntitlement::where('id', $entitlement->id)
            ->lockForUpdate()
            ->increment('used_days', $daysCount);

        $this->createAttendanceRecords($employee->id, $dates);

        return $vacationRequest;
    }
}
