<?php

namespace App\Http\Controllers\Api\V1\PayPeriods;

use App\Http\Controllers\Api\V1\PayPeriods\Concerns\LoadsPayPeriodEmployeeAvatarRelations;
use App\Http\Controllers\Controller;
use App\Http\Requests\PayPeriods\ShowPayPeriodRequest;
use App\Http\Resources\PayPeriods\PayPeriodResource;
use App\Models\PayPeriod;

/**
 * @OA\Get(
 *   path="/api/v1/pay-periods/{payPeriod}",
 *   summary="Get Pay Period Detail",
 *   description="Returns the frozen breakdown of a closed pay period: totals per employee and their daily evidence lines.",
 *   tags={"PayPeriods"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="payPeriod", in="path", required=true, @OA\Schema(type="string"), description="Public ID (ULID) of the pay period"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Pay period retrieved successfully",
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
 *   @OA\Response(response=404, description="Pay period not found")
 * )
 */
class ShowPayPeriodController extends Controller
{
    use LoadsPayPeriodEmployeeAvatarRelations;

    public function __invoke(ShowPayPeriodRequest $request, PayPeriod $payPeriod): PayPeriodResource
    {
        $payPeriod->load(array_merge(
            ['closedBy', 'reopenedBy', 'payPeriodEmployees.employee.user', 'payPeriodEmployees.lines'],
            $this->payPeriodEmployeeAvatarRelations()
        ));

        return new PayPeriodResource($payPeriod);
    }
}
