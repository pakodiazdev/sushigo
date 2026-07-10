<?php

namespace App\Actions\VacationRequests;

use App\Actions\VacationRequests\Concerns\VacationRequestGuards;
use App\Enums\VacationRequestStatus;
use App\Models\VacationEntitlement;
use App\Models\VacationRequest;
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

            VacationEntitlement::where('id', $vacationRequest->vacation_entitlement_id)
                ->lockForUpdate()
                ->increment('used_days', $vacationRequest->days_count);

            $vacationRequest->update([
                'status' => VacationRequestStatus::APPROVED,
                'approved_by' => $approvedById,
                'approved_at' => now(),
            ]);

            $this->createAttendanceRecords($vacationRequest->employee_id, $dates);

            return $vacationRequest;
        });

        return $vacationRequest->load(['employee', 'vacationEntitlement', 'requestedBy', 'approvedBy', 'dates']);
    }
}
