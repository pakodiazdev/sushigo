<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Resources\Employee\EmployeeResource;
use App\Models\Employee;

/**
 * @OA\Patch(
 *   path="/api/v1/employees/{id}/toggle-active",
 *   summary="Toggle Employee Active Status",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="ULID public identifier of the employee"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Employee status toggled successfully",
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
 *   @OA\Response(response=404, description="Employee not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ToggleEmployeeActiveController extends Controller
{
    /**
     * Toggle employee is_active flag.
     *
     * This is NOT a "baja". It simply enables/disables the employee
     * while keeping their employment period active.
     * Use deactivate/rehire for employment period management.
     * Requires an active employment period to operate.
     */
    public function __invoke(Employee $employee): EmployeeResource
    {
        if (! $employee->employmentPeriods()->active()->exists()) {
            abort(422, 'Employee does not have an active employment period. Use rehire to create a new employment period.');
        }

        $employee->update(['is_active' => ! $employee->is_active]);
        $employee->load(['user.roles', 'employmentPeriods.branch']);

        return new EmployeeResource($employee);
    }
}
