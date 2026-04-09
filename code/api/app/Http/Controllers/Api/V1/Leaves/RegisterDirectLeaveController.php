<?php

namespace App\Http\Controllers\Api\V1\Leaves;

use App\Actions\Leaves\RegisterDirectLeaveAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Leaves\RegisterDirectLeaveRequest;
use App\Http\Resources\Leave\LeaveResource;

class RegisterDirectLeaveController extends Controller
{
    public function __invoke(
        RegisterDirectLeaveRequest $request,
        RegisterDirectLeaveAction $action
    ): LeaveResource {
        $leave = $action($request->validated(), auth()->id());

        return (new LeaveResource($leave))->setStatusCode(201);
    }
}
