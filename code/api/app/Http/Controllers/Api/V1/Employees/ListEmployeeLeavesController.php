<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Resources\Leave\LeaveResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Employee;
use Illuminate\Http\Request;

class ListEmployeeLeavesController extends Controller
{
    public function __invoke(Request $request, Employee $employee): ResponsePaginated
    {
        $query = $employee->leaves()
            ->with(['leaveType', 'requestedBy', 'approvedBy', 'employee'])
            ->orderBy('start_date', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date_from')) {
            $query->where('start_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('end_date', '<=', $request->input('date_to'));
        }

        if ($request->filled('leave_type_id')) {
            $query->where('leave_type_id', $request->input('leave_type_id'));
        }

        $perPage = $request->input('per_page', 15);

        $leaves = $query->paginate($perPage);

        $leaves->getCollection()->transform(fn ($leave) => (new LeaveResource($leave))->resolve());

        return new ResponsePaginated(paginator: $leaves);
    }
}
