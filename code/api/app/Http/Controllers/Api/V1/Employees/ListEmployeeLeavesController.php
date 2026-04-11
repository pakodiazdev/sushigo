<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Enums\LeaveStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Leave\LeaveResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ListEmployeeLeavesController extends Controller
{
    public function __invoke(Request $request, Employee $employee): ResponsePaginated
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(array_column(LeaveStatus::cases(), 'value'))],
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date'],
            'overlap_from' => ['sometimes', 'date'],
            'overlap_to' => ['sometimes', 'date'],
            'leave_type_id' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $employee->leaves()
            ->with(['leaveType', 'requestedBy', 'approvedBy', 'employee']);

        if (array_key_exists('status', $validated)) {
            $query->where('status', $validated['status']);
        }

        if (array_key_exists('date_from', $validated)) {
            $query->where('start_date', '>=', $validated['date_from']);
        }

        if (array_key_exists('date_to', $validated)) {
            $query->where('end_date', '<=', $validated['date_to']);
        }

        if (array_key_exists('overlap_from', $validated)) {
            $query->where('end_date', '>=', $validated['overlap_from']);
        }

        if (array_key_exists('overlap_to', $validated)) {
            $query->where('start_date', '<=', $validated['overlap_to']);
        }

        if (array_key_exists('leave_type_id', $validated)) {
            $query->where('leave_type_id', (int) $validated['leave_type_id']);
        }

        $perPage = (int) ($validated['per_page'] ?? 15);

        $leaves = $query->paginate($perPage);

        $leaves->getCollection()->transform(fn ($leave) => (new LeaveResource($leave))->resolve());

        return new ResponsePaginated(paginator: $leaves);
    }
}
