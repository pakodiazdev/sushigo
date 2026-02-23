<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;

class ListWagesController extends Controller
{
    public function __invoke(Employee $employee): ResponseEntity
    {
        $wages = $employee->wageHistories()->orderByDesc('effective_from')->get()->toArray();

        return new ResponseEntity(data: $wages);
    }
}
