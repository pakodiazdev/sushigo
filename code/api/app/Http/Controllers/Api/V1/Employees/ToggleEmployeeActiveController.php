<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;

/**
 * @OA\Patch(
 *   path="/api/v1/employees/{id}/toggle-active",
 *   summary="Toggle Employee Active Status",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="employee", in="path", required=true, @OA\Schema(type="string"), description="Hashid of the employee"),
 *   @OA\Response(
 *       response=200,
 *       description="Employee status toggled successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/EmployeeResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(response=404, description="Employee not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ToggleEmployeeActiveController extends Controller
{
    public function __invoke(Employee $employee): ResponseEntity
    {
        $employee->update(['is_active' => !$employee->is_active]);

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
