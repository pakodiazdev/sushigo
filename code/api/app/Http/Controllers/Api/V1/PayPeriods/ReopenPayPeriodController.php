<?php

namespace App\Http\Controllers\Api\V1\PayPeriods;

use App\Http\Controllers\Controller;
use App\Http\Requests\PayPeriods\ReopenPayPeriodRequest;
use App\Http\Resources\PayPeriods\PayPeriodResource;
use App\Models\PayPeriod;
use App\Support\Clock\ApplicationClock;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Patch(
 *   path="/api/v1/pay-periods/{payPeriod}/reopen",
 *   summary="Reopen a closed pay period",
 *   description="Admin-only. Reopens a CLOSED pay period with a mandatory justification, recording who reopened it, when, and why for the audit trail.",
 *   tags={"PayPeriods"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="payPeriod", in="path", required=true, @OA\Schema(type="string"), description="Public ID (ULID) of the pay period"),
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(
 *       required={"reason"},
 *
 *       @OA\Property(property="reason", type="string", example="Corrección de horas extra mal capturadas")
 *     )
 *   ),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Pay period reopened successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/PayPeriodResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Pay period not found"),
 *   @OA\Response(response=422, description="Validation error or period is not closed")
 * )
 *
 * @throws ValidationException
 */
class ReopenPayPeriodController extends Controller
{
    public function __construct(private readonly ApplicationClock $clock) {}

    public function __invoke(ReopenPayPeriodRequest $request, PayPeriod $payPeriod): PayPeriodResource
    {
        if (! $payPeriod->isClosed()) {
            throw ValidationException::withMessages([
                'status' => 'Solo se pueden reabrir periodos cerrados.',
            ]);
        }

        $payPeriod->auditReason = $request->reason();
        $payPeriod->update([
            'status' => PayPeriod::STATUS_REOPENED,
            'reopened_by' => $request->user()->id,
            'reopened_at' => $this->clock->nowUtc(),
            'reopen_reason' => $request->reason(),
        ]);

        $payPeriod->load(['closedBy', 'reopenedBy', 'payPeriodEmployees.employee.user', 'payPeriodEmployees.lines']);

        return new PayPeriodResource($payPeriod);
    }
}
