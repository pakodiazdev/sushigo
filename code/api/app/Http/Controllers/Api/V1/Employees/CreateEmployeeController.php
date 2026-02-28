<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Actions\Employee\CreateEmployeeAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\StoreEmployeeRequest;
use App\Http\Resources\Employee\EmployeeResource;

/**
 * @OA\Post(
 *   path="/api/v1/employees",
 *   summary="Create Employee",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreEmployeeRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Employee created successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/EmployeeResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateEmployeeController extends Controller
{
    public function __invoke(
        StoreEmployeeRequest $request,
        CreateEmployeeAction $action
    ): EmployeeResource {
        $employee = $action($request->validated());

        return (new EmployeeResource($employee))->setStatusCode(201);
    }
}
