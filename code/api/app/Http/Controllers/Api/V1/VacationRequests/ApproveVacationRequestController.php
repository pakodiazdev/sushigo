<?php

namespace App\Http\Controllers\Api\V1\VacationRequests;

use App\Actions\VacationRequests\ApproveVacationRequestAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\VacationRequests\VacationRequestResource;
use App\Models\VacationRequest;

/**
 * @OA\Patch(
 *   path="/api/v1/vacation-requests/{id}/approve",
 *   summary="Approve Vacation Request",
 *   description="Approves a PENDING vacation request. Deducts the days from the employee's balance and blocks attendance capture on those days. Requires vacation-requests.approve permission.",
 *   tags={"Vacation Requests"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Vacation request public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Vacation request approved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/VacationRequestResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=404, description="Vacation request not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Vacation request is not in PENDING status", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ApproveVacationRequestController extends Controller
{
    public function __invoke(
        string $id,
        ApproveVacationRequestAction $action
    ): VacationRequestResource {
        $vacationRequest = VacationRequest::where('public_id', $id)->firstOrFail();

        $vacationRequest = $action($vacationRequest, auth()->id());

        return new VacationRequestResource($vacationRequest);
    }
}
