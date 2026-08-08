<?php

namespace App\Actions\VacationRequests;

use App\Actions\VacationRequests\Concerns\VacationRequestGuards;
use App\Enums\VacationRequestStatus;
use App\Models\VacationRequest;
use App\Support\Clock\ApplicationClock;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reject a PENDING vacation request.
 *
 * - Sets status = REJECTED, approved_by, approved_at.
 * - No entitlement balance or attendance records are modified.
 *
 * @see AP-055, RF-28
 */
class RejectVacationRequestAction
{
    use VacationRequestGuards;

    public function __construct(private readonly ApplicationClock $clock) {}

    /**
     * @throws ValidationException
     */
    public function __invoke(VacationRequest $vacationRequest, int $rejectedById): VacationRequest
    {
        $vacationRequest = DB::transaction(function () use ($vacationRequest, $rejectedById) {
            $vacationRequest = VacationRequest::lockForUpdate()->findOrFail($vacationRequest->id);

            $this->guardIsPending($vacationRequest);

            $vacationRequest->update([
                'status' => VacationRequestStatus::REJECTED,
                'approved_by' => $rejectedById,
                'approved_at' => $this->clock->nowUtc(),
            ]);

            return $vacationRequest;
        });

        return $vacationRequest->load(['employee', 'vacationEntitlement', 'requestedBy', 'approvedBy']);
    }
}
