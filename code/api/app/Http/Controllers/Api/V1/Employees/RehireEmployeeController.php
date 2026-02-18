<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\RehireEmployeeRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class RehireEmployeeController extends Controller
{
    public function __invoke(RehireEmployeeRequest $request, Employee $employee): ResponseEntity
    {
        DB::transaction(function () use ($request, $employee) {
            $employee->employmentPeriods()->create([
                'branch_id' => $request->branch_id,
                'start_date' => $request->start_date,
                'is_active' => true,
            ]);

            $employee->update(['is_active' => true]);
        });

        $employee->load(['user', 'employmentPeriods.branch']);

        return new ResponseEntity(
            data: $employee->toApiArray()
        );
    }
}
