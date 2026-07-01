<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Resources\Employees\VacationEntitlementResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use App\Services\VacationEntitlementService;

class ListVacationEntitlementsController extends Controller
{
    public function __construct(private readonly VacationEntitlementService $entitlements) {}

    public function __invoke(Employee $employee): ResponseEntity
    {
        $this->entitlements->generateMissing($employee);

        $entitlements = $employee->vacationEntitlements()
            ->orderByDesc('year')
            ->get();

        return new ResponseEntity(
            data: VacationEntitlementResource::collection($entitlements)->toArray(request()),
            meta: $this->entitlements->summary($employee),
        );
    }
}
