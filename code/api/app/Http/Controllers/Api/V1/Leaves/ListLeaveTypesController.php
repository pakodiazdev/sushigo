<?php

namespace App\Http\Controllers\Api\V1\Leaves;

use App\Http\Controllers\Controller;
use App\Http\Resources\Leave\LeaveTypeResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\LeaveType;

class ListLeaveTypesController extends Controller
{
    public function __invoke(): ResponseEntity
    {
        $types = LeaveType::where('is_active', true)
            ->orderBy('name')
            ->get();

        $data = $types
            ->map(fn (LeaveType $t) => (new LeaveTypeResource($t))->resolve())
            ->values()
            ->all();

        return new ResponseEntity(data: $data);
    }
}
