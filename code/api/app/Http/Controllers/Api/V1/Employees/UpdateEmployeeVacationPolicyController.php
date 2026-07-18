<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\UpdateEmployeeVacationPolicyRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use App\Services\VacationEntitlementResolver;

/**
 * @OA\Put(
 *   path="/api/v1/employees/{employee}/vacation-policy-override",
 *   summary="Set or clear an employee's contractual vacation policy override",
 *   description="A non-null rule_key takes precedence over the tenant-wide vacation rule for this employee. Passing rule_key=null clears the override.",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateEmployeeVacationPolicyRequest")),
 *
 *   @OA\Response(response=200, description="Override updated successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateEmployeeVacationPolicyController extends Controller
{
    public function __invoke(
        UpdateEmployeeVacationPolicyRequest $request,
        Employee $employee,
        VacationEntitlementResolver $resolver,
    ): ResponseEntity {
        $employee->update($request->updateData());

        return new ResponseEntity(data: [
            'rule_key' => $employee->vacation_entitlement_rule_key,
            'tiers' => $employee->vacation_entitlement_custom_table ?? [],
            'active_rule_label' => $resolver->resolve($employee)->label(),
        ]);
    }
}
