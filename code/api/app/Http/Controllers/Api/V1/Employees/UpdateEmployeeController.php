<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\UpdateEmployeeRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

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
        DB::transaction(function () use ($request, $employee) {
            $validated = $request->validated();

            $roles = $validated['roles'] ?? null;
            $userFields = array_intersect_key($validated, array_flip(['email', 'phone']));

            // user_id has no validation rule so it never appears in validated(),
            // but we keep it in the exclude list as defense-in-depth.
            $exclude = ['email', 'phone', 'roles', 'user_id'];

            $employeeFields = array_diff_key($validated, array_flip($exclude));

            $employee->update($employeeFields);

            if ($roles !== null) {
                $employee->syncPositionRoles($roles);
            }

            // Prepare user updates: keep name in sync when employee names change
            $userUpdates = $userFields;

            // Sync phone_country when phone changes
            if (array_key_exists('phone', $userFields)) {
                $phoneCountry = config('employees.default_phone_country');
                $userUpdates['phone_country'] = $userFields['phone'] ? $phoneCountry : null;
            }

            // If first_name or last_name were provided, rebuild the user.name
            if ($employee->user && (array_key_exists('first_name', $employeeFields) || array_key_exists('last_name', $employeeFields))) {
                $first = $employeeFields['first_name'] ?? $employee->first_name;
                $last = $employeeFields['last_name'] ?? $employee->last_name;
                $newName = trim("{$first} {$last}");

                if ($employee->user->name !== $newName) {
                    $userUpdates['name'] = $newName;
                }
            }

            if (!empty($userUpdates) && $employee->user) {
                $employee->user->update($userUpdates);
            }
        });

        $employee->load(['user']);

        return new ResponseEntity(
            data: $employee->toApiArray()
        );
    }
}
