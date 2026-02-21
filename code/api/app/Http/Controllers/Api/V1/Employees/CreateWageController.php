<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\StoreWageRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use App\Models\WageHistory;
use App\Actions\Employee\CreateWageAction;

class CreateWageController extends Controller
{
    public function __invoke(StoreWageRequest $request, Employee $employee, CreateWageAction $action): ResponseEntity
    {
        $data = $request->validated();

        $created = ($action)($employee, $data);

        return new ResponseEntity(data: $created->toArray(), status: 201);
    }
}
