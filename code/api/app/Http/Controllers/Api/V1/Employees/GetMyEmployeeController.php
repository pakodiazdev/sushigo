<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Api\V1\Employees\Concerns\LoadsEmployeeUserAvatarRelations;
use App\Http\Controllers\Controller;
use App\Http\Resources\Employee\EmployeeResource;
use App\Http\Responses\Common\ResponseError;
use App\Models\Employee;
use Illuminate\Http\Request;

class GetMyEmployeeController extends Controller
{
    use LoadsEmployeeUserAvatarRelations;

    public function __invoke(Request $request): EmployeeResource|ResponseError
    {
        $user = $request->user();

        $employee = Employee::where('user_id', $user->id)
            ->with(array_merge(['user.roles', 'employmentPeriods.branch'], $this->employeeUserAvatarRelations()))
            ->first();

        if (! $employee) {
            return new ResponseError(
                message: 'No existe un empleado vinculado a tu cuenta.',
                status: 404
            );
        }

        return new EmployeeResource($employee);
    }
}
