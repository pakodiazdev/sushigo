<?php

namespace App\Http\Controllers\Api\V1\Overtime;

use App\Http\Controllers\Controller;
use App\Http\Resources\Overtime\OvertimePayConfigResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;

class GetOvertimeConfigController extends Controller
{
    public function __invoke(Employee $employee): ResponseEntity
    {
        $configs = $employee->overtimePayConfigs()
            ->orderBy('effective_from', 'desc')
            ->get();

        $data = OvertimePayConfigResource::collection($configs)->resolve();

        return new ResponseEntity(data: $data);
    }
}
