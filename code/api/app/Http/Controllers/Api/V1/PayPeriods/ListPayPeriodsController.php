<?php

namespace App\Http\Controllers\Api\V1\PayPeriods;

use App\Http\Controllers\Controller;
use App\Http\Requests\PayPeriods\ListPayPeriodsRequest;
use App\Http\Resources\PayPeriods\PayPeriodResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\PayPeriod;

/**
 * @OA\Get(
 *   path="/api/v1/pay-periods",
 *   summary="List Pay Periods",
 *   tags={"PayPeriods"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="branch_id", in="query", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"OPEN", "CLOSED", "REOPENED"})),
 *   @OA\Parameter(name="period_start", in="query", @OA\Schema(type="string", format="date")),
 *   @OA\Parameter(name="period_end", in="query", @OA\Schema(type="string", format="date")),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15)),
 *   @OA\Parameter(name="page", in="query", @OA\Schema(type="integer", default=1)),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Pay periods retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/PayPeriodResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class ListPayPeriodsController extends Controller
{
    public function __invoke(ListPayPeriodsRequest $request): ResponsePaginated
    {
        $query = PayPeriod::query()
            ->where('branch_id', $request->validated('branch_id'))
            ->withCount('payPeriodEmployees')
            ->with(['closedBy', 'reopenedBy'])
            ->latest('period_start');

        if ($status = $request->validated('status')) {
            $query->where('status', $status);
        }

        if ($periodStart = $request->validated('period_start')) {
            $query->whereDate('period_start', '>=', $periodStart);
        }

        if ($periodEnd = $request->validated('period_end')) {
            $query->whereDate('period_end', '<=', $periodEnd);
        }

        $periods = $query->paginate($request->perPage());

        $periods->getCollection()->transform(
            fn (PayPeriod $period) => (new PayPeriodResource($period))->resolve()
        );

        return new ResponsePaginated($periods);
    }
}
