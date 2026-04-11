<?php

namespace App\Http\Controllers\Api\V1\Leaves;

use App\Actions\Leaves\RegisterLeaveRequestAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Leaves\RegisterLeaveRequestRequest;
use App\Http\Resources\Leave\LeaveResource;

class RegisterLeaveRequestController extends Controller
{
    public function __invoke(
        RegisterLeaveRequestRequest $request,
        RegisterLeaveRequestAction $action
    ): LeaveResource {
        $leave = $action($request->validated(), auth()->id());

        return (new LeaveResource($leave))->setStatusCode(201);
    }
}
