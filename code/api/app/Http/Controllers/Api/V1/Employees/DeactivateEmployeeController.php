<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Api\V1\Employees\Concerns\LoadsEmployeeUserAvatarRelations;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\DeactivateEmployeeRequest;
use App\Http\Resources\Employee\EmployeeResource;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class DeactivateEmployeeController extends Controller
{
    use LoadsEmployeeUserAvatarRelations;

    public function __invoke(DeactivateEmployeeRequest $request, Employee $employee): EmployeeResource
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
                'termination_type' => $request->termination_type,
            ]);

            $employee->update(['is_active' => false]);
        });

        $employee->load(array_merge(['user.roles', 'employmentPeriods.branch'], $this->employeeUserAvatarRelations()));

        return new EmployeeResource($employee);
    }
}
