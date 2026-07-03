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
 * requested range. Attendance records are only created on approval.
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
        $daysCount = $this->computeDaysCount($data['start_date'], $data['end_date']);

        $vacationRequest = DB::transaction(function () use ($data, $employee, $daysCount, $requestedById) {
            $entitlement = $this->resolveEntitlementForYear($employee, $data['start_date']);
            $this->guardSufficientBalance($entitlement, $daysCount);
            $this->guardNoOverlappingApprovedVacation($employee->id, $data['start_date'], $data['end_date']);

            return VacationRequest::create([
                'employee_id' => $employee->id,
                'vacation_entitlement_id' => $entitlement->id,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'days_count' => $daysCount,
                'status' => VacationRequestStatus::PENDING,
                'requested_by' => $requestedById,
                'notes' => $data['notes'] ?? null,
            ]);
        });

        return $vacationRequest->load(['employee', 'vacationEntitlement', 'requestedBy', 'approvedBy']);
    }
}
