<?php

namespace App\Http\Controllers\Api\V1\Leaves;

use App\Actions\Leaves\ApproveLeaveAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Leave\LeaveResource;
use App\Models\Leave;

class ApproveLeaveController extends Controller
{
    public function __invoke(
        string $id,
        ApproveLeaveAction $action
    ): LeaveResource {
        $leave = Leave::where('public_id', $id)->firstOrFail();

        $leave = $action($leave, auth()->id());

        return new LeaveResource($leave);
    }
}
