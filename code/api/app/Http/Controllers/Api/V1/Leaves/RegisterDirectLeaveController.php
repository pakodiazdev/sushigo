<?php

namespace App\Http\Controllers\Api\V1\Leaves;

use App\Actions\Leaves\RegisterDirectLeaveAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Leaves\RegisterDirectLeaveRequest;
use App\Http\Resources\Leave\LeaveResource;

/**
 * @OA\Post(
 *   path="/api/v1/leaves",
 *   summary="Register Direct Leave",
 *   description="Creates a leave record with APPROVED status directly. Requires leaves.register-direct permission.",
 *   tags={"Leaves"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/RegisterDirectLeaveRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Leave registered successfully",
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
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class RegisterDirectLeaveController extends Controller
{
    public function __invoke(
        RegisterDirectLeaveRequest $request,
        RegisterDirectLeaveAction $action
    ): LeaveResource {
        $leave = $action($request->validated(), auth()->id());

        return (new LeaveResource($leave))->setStatusCode(201);
    }
}
