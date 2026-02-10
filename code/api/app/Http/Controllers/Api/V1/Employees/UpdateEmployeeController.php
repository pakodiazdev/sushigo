<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\UpdateEmployeeRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;

/**
 * @OA\Put(
 *   path="/api/v1/employees/{id}",
 *   summary="Update Employee",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="employee", in="path", required=true, @OA\Schema(type="string"), description="Hashid of the employee"),
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateEmployeeRequest")),
 *   @OA\Response(
 *       response=200,
 *       description="Employee updated successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/EmployeeResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(response=404, description="Employee not found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateEmployeeController extends Controller
{
    public function __invoke(UpdateEmployeeRequest $request, Employee $employee): ResponseEntity
    {
        $employee->update($request->validated());

        return new ResponseEntity(
            data: [
                'id' => $employee->hashid,
                'code' => $employee->code,
                'first_name' => $employee->first_name,
                'last_name' => $employee->last_name,
                'role' => $employee->role->value,
                'is_active' => $employee->is_active,
                'user_id' => $employee->user_id,
                'meta' => $employee->meta,
                'created_at' => $employee->created_at,
                'updated_at' => $employee->updated_at,
            ]
        );
    }
}
