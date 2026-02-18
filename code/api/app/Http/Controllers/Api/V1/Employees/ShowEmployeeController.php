<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;

/**
 * @OA\Get(
 *   path="/api/v1/employees/{id}",
 *   summary="Get Employee by ID",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="Unique identifier of the employee"),
 *   @OA\Response(
 *       response=200,
 *       description="Employee retrieved successfully",
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
class ShowEmployeeController extends Controller
{
    public function __invoke(Employee $employee): ResponseEntity
    {
        $employee->load(['user.roles', 'employmentPeriods.branch']);

        return new ResponseEntity(
            data: $employee->toApiArray()
        );
    }
}
