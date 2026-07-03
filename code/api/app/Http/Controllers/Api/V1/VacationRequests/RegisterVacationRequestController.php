<?php

namespace App\Http\Controllers\Api\V1\VacationRequests;

use App\Actions\VacationRequests\RegisterVacationRequestAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\VacationRequests\RegisterVacationRequestRequest;
use App\Http\Resources\VacationRequests\VacationRequestResource;

/**
 * @OA\Post(
 *   path="/api/v1/vacation-requests",
 *   summary="Register Vacation Request",
 *   description="Creates a vacation request with PENDING status that requires approval. Validates sufficient vacation balance. Requires vacation-requests.request permission.",
 *   tags={"Vacation Requests"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/RegisterVacationRequestRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Vacation request created successfully",
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
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class RegisterVacationRequestController extends Controller
{
    public function __invoke(
        RegisterVacationRequestRequest $request,
        RegisterVacationRequestAction $action
    ): VacationRequestResource {
        $vacationRequest = $action($request->validated(), auth()->id());

        return (new VacationRequestResource($vacationRequest))->setStatusCode(201);
    }
}
