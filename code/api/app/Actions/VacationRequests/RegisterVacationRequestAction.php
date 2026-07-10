<?php

namespace App\Actions\VacationRequests;

use App\Actions\VacationRequests\Concerns\VacationRequestGuards;
use App\Enums\VacationRequestStatus;
use App\Models\Employee;
use App\Models\VacationRequest;
use Illuminate\Support\Facades\DB;

/**
 * Register a vacation REQUEST (status = PENDING).
 *
 * Validates that the employee has sufficient vacation balance for the
 * requested days. Attendance records are only created on approval.
 *
 * @see AP-054, RF-27
 */
class RegisterVacationRequestAction
{
    use VacationRequestGuards;

    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(array $data, int $requestedById): VacationRequest
    {
        $employee = Employee::where('public_id', $data['employee_id'])->firstOrFail();
        $dates = $this->normalizeDates($data['dates']);
        $daysCount = count($dates);

        $vacationRequest = DB::transaction(function () use ($dates, $data, $employee, $daysCount, $requestedById) {
            $entitlement = $this->resolveEntitlementForYear($employee, $dates[0]);
            $this->guardSufficientBalance($entitlement, $daysCount);
            $this->guardNoOverlappingApprovedVacation($employee->id, $dates);

            $vacationRequest = VacationRequest::create([
                'employee_id' => $employee->id,
                'vacation_entitlement_id' => $entitlement->id,
                'start_date' => $dates[0],
                'end_date' => $dates[count($dates) - 1],
                'days_count' => $daysCount,
                'status' => VacationRequestStatus::PENDING,
                'requested_by' => $requestedById,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->persistVacationRequestDates($vacationRequest, $dates);

            return $vacationRequest;
        });

        return $vacationRequest->load(['employee', 'vacationEntitlement', 'requestedBy', 'approvedBy', 'dates']);
    }
}
