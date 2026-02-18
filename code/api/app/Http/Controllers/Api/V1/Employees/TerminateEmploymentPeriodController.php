<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\TerminateEmploymentPeriodRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use App\Models\EmploymentPeriod;

class TerminateEmploymentPeriodController extends Controller
{
    public function __invoke(
        TerminateEmploymentPeriodRequest $request,
        Employee $employee,
        EmploymentPeriod $employmentPeriod
    ): ResponseEntity {
        $employmentPeriod->update([
            'end_date' => $request->validated('end_date'),
            'termination_reason' => $request->validated('termination_reason'),
            'is_active' => false,
        ]);

        $employmentPeriod->load('branch');

        return new ResponseEntity(
            data: [
                'id' => $employmentPeriod->public_id,
                'branch_id' => $employmentPeriod->branch_id,
                'branch_name' => $employmentPeriod->branch?->name,
                'start_date' => $employmentPeriod->start_date->toDateString(),
                'end_date' => $employmentPeriod->end_date->toDateString(),
                'termination_reason' => $employmentPeriod->termination_reason,
                'is_active' => false,
            ]
        );
    }
}
