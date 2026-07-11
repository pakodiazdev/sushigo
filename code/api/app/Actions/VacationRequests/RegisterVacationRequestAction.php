<?php

namespace App\Actions\VacationRequests;

use App\Actions\VacationRequests\Concerns\VacationRequestGuards;
use App\Enums\VacationRequestStatus;
use App\Models\Employee;
use App\Models\VacationRequest;
use Illuminate\Support\Facades\DB;

/**
 * Register a vacation request.
 *
 * Validates that the employee has sufficient vacation balance for the
 * requested days. When the requester holds vacation-requests.approve
 * (an admin/manager registering on behalf of an employee), the request is
 * approved immediately — the two-step PENDING→approve flow only makes sense
 * when the requester and the approver are different people, which is the
 * case for an employee self-servicing their own vacation request.
 *
 * @see AP-054, RF-27
 */
class RegisterVacationRequestAction
{
    use VacationRequestGuards;

    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(array $data, int $requestedById, bool $autoApprove = false): VacationRequest
    {
        $employee = Employee::where('public_id', $data['employee_id'])->firstOrFail();
        $dates = $this->normalizeDates($data['dates']);
        $notes = $data['notes'] ?? null;

        $vacationRequest = DB::transaction(function () use ($dates, $employee, $notes, $requestedById, $autoApprove) {
            if ($autoApprove) {
                return $this->createApprovedVacationRequest($employee, $dates, $requestedById, $requestedById, $notes);
            }

            $daysCount = count($dates);
            $entitlement = $this->resolveEntitlementForYear($employee, $dates);
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
                'notes' => $notes,
            ]);

            $this->persistVacationRequestDates($vacationRequest, $dates);

            return $vacationRequest;
        });

        return $vacationRequest->load(['employee', 'vacationEntitlement', 'requestedBy', 'approvedBy', 'dates']);
    }
}
