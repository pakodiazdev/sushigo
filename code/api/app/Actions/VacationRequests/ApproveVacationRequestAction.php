<?php

namespace App\Actions\VacationRequests;

use App\Actions\VacationRequests\Concerns\VacationRequestGuards;
use App\Models\VacationRequest;
use App\Support\Clock\ApplicationClock;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Approve a PENDING vacation request.
 *
 * - Sets status = APPROVED, approved_by, approved_at.
 * - Increments used_days on the linked VacationEntitlement.
 * - Creates/updates Attendance records for each selected date with day_status = VACATION.
 * - Guards: only PENDING requests may be approved; no worked attendance overlap.
 *
 * @see AP-055, RF-28
 */
class ApproveVacationRequestAction
{
    use VacationRequestGuards;

    // $clock is used by VacationRequestGuards::finalizeApproval(), a trait
    // method defined in a separate file that Sonar's per-file analysis
    // doesn't resolve as a usage of this property.
    public function __construct(private readonly ApplicationClock $clock) {} // NOSONAR

    /**
     * @throws ValidationException
     */
    public function __invoke(VacationRequest $vacationRequest, int $approvedById): VacationRequest
    {
        $vacationRequest = DB::transaction(function () use ($vacationRequest, $approvedById) {
            $vacationRequest = VacationRequest::lockForUpdate()->findOrFail($vacationRequest->id);

            $dates = $vacationRequest->dates()
                ->pluck('date')
                ->map(fn ($date) => $date->toDateString())
                ->all();

            $this->guardIsPending($vacationRequest);
            $this->guardNoExistingWorkedAttendance($vacationRequest->employee_id, $dates);
            $this->guardNoOverlappingApprovedVacation($vacationRequest->employee_id, $dates, $vacationRequest->id);

            $this->finalizeApproval($vacationRequest, $dates, $approvedById);

            return $vacationRequest;
        });

        return $vacationRequest->load(['employee', 'vacationEntitlement', 'requestedBy', 'approvedBy', 'dates']);
    }
}
