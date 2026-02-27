<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\RehireEmployeeRequest;
use App\Http\Resources\Employee\EmployeeResource;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class RehireEmployeeController extends Controller
{
    public function __invoke(RehireEmployeeRequest $request, Employee $employee): EmployeeResource
    {
        DB::transaction(function () use ($request, $employee) {
            // Lock existing active periods to prevent race conditions
            $hasActive = $employee->employmentPeriods()->active()->lockForUpdate()->exists();
            if ($hasActive) {
                abort(422, 'Employee already has an active employment period.');
            }

            $employee->employmentPeriods()->create([
                'branch_id' => $request->branch_id,
                'start_date' => $request->start_date,
                'is_active' => true,
            ]);

            $employee->update(['is_active' => true]);
        });

        $employee->load(['user.roles', 'employmentPeriods.branch']);

        return new EmployeeResource($employee);
    }
}
