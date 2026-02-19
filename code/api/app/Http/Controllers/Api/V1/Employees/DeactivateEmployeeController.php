<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\DeactivateEmployeeRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class DeactivateEmployeeController extends Controller
{
    public function __invoke(DeactivateEmployeeRequest $request, Employee $employee): ResponseEntity
    {
        DB::transaction(function () use ($request, $employee) {
            $activePeriod = $employee->employmentPeriods()->active()->lockForUpdate()->first();
            if (! $activePeriod) {
                abort(422, 'Employee has no active employment period.');
            }

            $activePeriod->update([
                'is_active' => false,
                'end_date' => $request->end_date,
                'termination_reason' => $request->termination_reason,
            ]);

            $employee->update(['is_active' => false]);
        });

        $employee->load(['user.roles', 'employmentPeriods.branch']);

        return new ResponseEntity(
            data: $employee->toApiArray()
        );
    }
}
