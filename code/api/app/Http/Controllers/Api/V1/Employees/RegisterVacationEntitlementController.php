<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Contracts\VacationEntitlementRule;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\RegisterVacationEntitlementRequest;
use App\Http\Resources\Employees\VacationEntitlementResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use App\Models\VacationEntitlement;

class RegisterVacationEntitlementController extends Controller
{
    public function __construct(private readonly VacationEntitlementRule $rule) {}

    public function __invoke(RegisterVacationEntitlementRequest $request, Employee $employee): ResponseEntity
    {
        $year = $request->year();
        $hireYear = $employee->employmentPeriods()->min('start_date');
        $yearsOfService = $hireYear
            ? max(1, $year - (int) substr($hireYear, 0, 4))
            : 1;

        $entitlement = VacationEntitlement::create([
            'employee_id' => $employee->id,
            'year' => $year,
            'entitled_days' => $this->rule->calculate($yearsOfService),
            'used_days' => 0,
            'rule_key' => class_basename($this->rule),
        ]);

        return new ResponseEntity(
            data: (new VacationEntitlementResource($entitlement))->toArray($request),
            status: 201,
        );
    }
}
