<?php

namespace App\Http\Controllers\Api\V1\Leaves;

use App\Actions\Leaves\RegisterLeaveRequestAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Leaves\RegisterLeaveRequestRequest;
use App\Http\Resources\Leave\LeaveResource;

/**
 * @OA\Post(
 *   path="/api/v1/leaves/requests",
 *   summary="Register Leave Request",
 *   description="Creates a leave record with PENDING status that requires approval. Requires leaves.request permission.",
 *   tags={"Leaves"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/RegisterDirectLeaveRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Leave request created successfully",
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
class RegisterLeaveRequestController extends Controller
{
    public function __invoke(
        RegisterLeaveRequestRequest $request,
        RegisterLeaveRequestAction $action
    ): LeaveResource {
        $leave = $action($request->validated(), auth()->id());

        return (new LeaveResource($leave))->setStatusCode(201);
    }
}
