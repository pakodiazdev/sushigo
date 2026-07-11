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
 *   description="Registers a vacation request directly on behalf of an employee. Requires vacation-requests.schedule permission (admin/super-admin by default) — self-service employees request their own vacation through POST /employee-requests instead. If the requester also holds vacation-requests.approve, the request is approved immediately instead of staying PENDING.",
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
        $vacationRequest = $action(
            $request->validated(),
            auth()->id(),
            auth()->user()->can('vacation-requests.approve')
        );

        return (new VacationRequestResource($vacationRequest))->setStatusCode(201);
    }
}
