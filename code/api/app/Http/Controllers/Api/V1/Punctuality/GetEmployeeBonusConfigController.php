<?php

namespace App\Http\Controllers\Api\V1\Punctuality;

use App\Http\Controllers\Controller;
use App\Http\Resources\Punctuality\EmployeeBonusConfigResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;

class GetEmployeeBonusConfigController extends Controller
{
    public function __invoke(Employee $employee): ResponseEntity
    {
        $configs = $employee->bonusConfigs()
            ->with('bonusGroup')
            ->orderBy('effective_from', 'desc')
            ->get();

        $data = EmployeeBonusConfigResource::collection($configs)->resolve();

        return new ResponseEntity(data: $data);
    }
}
