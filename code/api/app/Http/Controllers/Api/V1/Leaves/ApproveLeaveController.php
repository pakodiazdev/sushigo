<?php

namespace App\Http\Controllers\Api\V1\Leaves;

use App\Actions\Leaves\ApproveLeaveAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Leave\LeaveResource;
use App\Models\Leave;

/**
 * @OA\Patch(
 *   path="/api/v1/leaves/{id}/approve",
 *   summary="Approve Leave Request",
 *   description="Approves a PENDING leave request. Requires leaves.approve permission.",
 *   tags={"Leaves"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Leave public_id (ULID)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Leave approved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/LeaveResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=404, description="Leave not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Leave is not in PENDING status", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ApproveLeaveController extends Controller
{
    public function __invoke(
        string $id,
        ApproveLeaveAction $action
    ): LeaveResource {
        $leave = Leave::where('public_id', $id)->firstOrFail();

        $leave = $action($leave, auth()->id());

        return new LeaveResource($leave);
    }
}
