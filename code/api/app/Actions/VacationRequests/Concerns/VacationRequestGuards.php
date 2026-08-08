<?php

namespace App\Actions\VacationRequests\Concerns;

use App\Enums\DayStatus;
use App\Enums\VacationRequestStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\VacationEntitlement;
use App\Models\VacationRequest;
use App\Services\SeniorityService;
use App\Services\VacationEntitlementService;
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
     * Resolve the employee's VacationEntitlement whose service-year window
     * (from one anniversary up to, but not including, the next) contains the
     * given reference date.
     *
     * An entitlement earned on an anniversary is valid to use throughout the
     * following service year, which usually spans two calendar years (e.g. an
     * anniversary on Nov 20 grants days usable through the following Nov 19)
     * — so this matches by anniversary window, not the literal calendar year
     * of the reference date.
     *
     * Missing entitlements for anniversaries the employee has already reached
     * are generated on demand here, so approval doesn't depend on someone
     * having previously opened the employee's Vacaciones section.
     *
     * All dates must fall within the resolved entitlement's window — a
     * request cannot silently charge days that belong to a different service
     * year (e.g. selecting days before and after an anniversary) against a
     * single entitlement.
     *
     * @param  array<int, string>  $dates  Normalized (sorted ascending)
     *
     * @throws ValidationException
     */
    private function resolveEntitlementForYear(Employee $employee, array $dates): VacationEntitlement
    {
        $seniority = app(SeniorityService::class);
        app(VacationEntitlementService::class)->generateMissing($employee);

        $referenceCarbon = Carbon::parse($dates[0]);

        try {
            $seniorityYear = $seniority->completedYears($employee, $referenceCarbon);
        } catch (\LogicException) {
            $seniorityYear = 0;
        }

        $entitlement = $seniorityYear >= 1
            ? VacationEntitlement::where('employee_id', $employee->id)
                ->where('year', $seniority->anniversaryDateForYear($employee, $seniorityYear)->year)
                ->first()
            : null;

        if (! $entitlement) {
            throw ValidationException::withMessages([
                'employee_id' => 'El empleado no tiene una asignación de vacaciones para el año de la fecha indicada.',
            ]);
        }

        $windowStart = $seniority->anniversaryDateForYear($employee, $seniorityYear);
        $windowEnd = $seniority->anniversaryDateForYear($employee, $seniorityYear + 1);

        foreach ($dates as $date) {
            $carbonDate = Carbon::parse($date);
            if ($carbonDate->lt($windowStart) || $carbonDate->gte($windowEnd)) {
                throw ValidationException::withMessages([
                    'dates' => 'Todas las fechas deben pertenecer al mismo período de antigüedad (a partir del '.$windowStart->toDateString().').',
                ]);
            }
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
        $now = $this->clock->nowUtc();

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
     * Re-validates the balance under a row lock immediately before
     * incrementing — the request may have sat PENDING for a while, during
     * which other approved requests could have consumed the balance that was
     * available when this one was created.
     *
     * @param  array<int, string>  $dates
     *
     * @throws ValidationException
     */
    private function finalizeApproval(VacationRequest $vacationRequest, array $dates, int $approvedById): void
    {
        $entitlement = VacationEntitlement::where('id', $vacationRequest->vacation_entitlement_id)
            ->lockForUpdate()
            ->firstOrFail();

        $this->guardSufficientBalance($entitlement, $vacationRequest->days_count);

        $entitlement->increment('used_days', $vacationRequest->days_count);

        $vacationRequest->update([
            'status' => VacationRequestStatus::APPROVED,
            'approved_by' => $approvedById,
            'approved_at' => $this->clock->nowUtc(),
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

        $entitlement = $this->resolveEntitlementForYear($employee, $dates);
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
            'approved_at' => $approvedAt ?? $this->clock->nowUtc(),
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
