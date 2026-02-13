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
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Unique identifier of the employee"),
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
        $validated = $request->validated();

        // Extract non-employee fields
        $roles = $validated['roles'] ?? null;
        $userFields = array_intersect_key($validated, array_flip(['email', 'phone']));
        $employeeFields = array_diff_key($validated, array_flip(['email', 'phone', 'roles']));

        $employee->update($employeeFields);

        if ($roles !== null) {
            $employee->syncPositionRoles($roles);
        }

        if (!empty($userFields) && $employee->user) {
            $employee->user->update($userFields);
        }

        $employee->load(['user', 'roles']);

        return new ResponseEntity(
            data: $employee->toApiArray()
        );
    }
}
