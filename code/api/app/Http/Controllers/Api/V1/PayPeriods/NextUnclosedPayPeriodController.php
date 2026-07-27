<?php

namespace App\Http\Controllers\Api\V1\PayPeriods;

use App\Actions\Payroll\FindOldestUnclosedPayPeriodAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\PayPeriods\NextUnclosedPayPeriodRequest;
use App\Http\Responses\Common\ResponseEntity;

/**
 * @OA\Get(
 *   path="/api/v1/pay-periods/next-unclosed",
 *   summary="Find the oldest week that still needs an initial close",
 *   description="Walks every Monday–Sunday week for the branch from its first PayPeriod forward and returns the first one with no PayPeriod row at all. Periods may be closed out of order, so this is not simply 'the week after the latest period' — that would hide an older unclosed week once a newer one is closed first.",
 *   tags={"PayPeriods"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="branch_id", in="query", required=true, @OA\Schema(type="integer")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Oldest unclosed week found",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="object",
 *
 *                  @OA\Property(property="period_start", type="string", format="date", example="2026-06-22"),
 *                  @OA\Property(property="period_end", type="string", format="date", example="2026-06-28")
 *              ))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class NextUnclosedPayPeriodController extends Controller
{
    public function __construct(private FindOldestUnclosedPayPeriodAction $findOldestUnclosed) {}

    public function __invoke(NextUnclosedPayPeriodRequest $request): ResponseEntity
    {
        $range = ($this->findOldestUnclosed)($request->branchId());

        return new ResponseEntity(data: $range);
    }
}
