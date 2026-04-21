<?php

namespace App\Http\Controllers\Api\V1\EmployeeRequests;

use App\Http\Controllers\Controller;
use App\Http\Requests\EmployeeRequests\StoreEmployeeRequestRequest;
use App\Http\Resources\EmployeeRequest\EmployeeRequestResource;
use App\Services\EmployeeRequests\EmployeeRequestService;

/**
 * @OA\Post(
 *   path="/api/v1/employee-requests",
 *   summary="Create Employee Request",
 *   description="Creates a unified employee request. If auto_approve=true, request is approved immediately.",
 *   tags={"EmployeeRequests"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreEmployeeRequestRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Employee request created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/EmployeeRequestResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateEmployeeRequestController extends Controller
{
    public function __invoke(
        StoreEmployeeRequestRequest $request,
        EmployeeRequestService $service,
    ): EmployeeRequestResource {
        $employeeRequest = $service->create(
            $request->validated(),
            (bool) $request->boolean('auto_approve', false)
        );

        return (new EmployeeRequestResource($employeeRequest))->setStatusCode(201);
    }
}
