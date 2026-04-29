<?php

namespace App\Http\Controllers\Api\V1\Punctuality;

use App\Http\Controllers\Controller;
use App\Http\Resources\Punctuality\EmployeeBonusConfigResource;
use App\Models\Employee;
use Illuminate\Http\Resources\Json\ResourceCollection;

class GetEmployeeBonusConfigController extends Controller
{
    public function __invoke(Employee $employee): ResourceCollection
    {
        $configs = $employee->bonusConfigs()
            ->with('bonusGroup')
            ->orderBy('effective_from', 'desc')
            ->get();

        return EmployeeBonusConfigResource::collection($configs);
    }
}
