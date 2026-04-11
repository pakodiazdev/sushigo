<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Enums\LeaveStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Leave\LeaveResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @OA\Get(
 *   path="/api/v1/employees/{employee}/leaves",
 *   summary="List Employee Leaves",
 *   description="Returns a paginated list of leaves for a specific employee. Supports filtering by status, date range, overlap range, and leave type.",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employee", in="path", required=true, @OA\Schema(type="string"), description="Employee public_id (ULID)"),
 *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"APPROVED", "PENDING", "REJECTED", "CANCELLED"}), description="Filter by leave status"),
 *   @OA\Parameter(name="date_from", in="query", @OA\Schema(type="string", format="date"), description="Filter leaves with start_date >= this date"),
 *   @OA\Parameter(name="date_to", in="query", @OA\Schema(type="string", format="date"), description="Filter leaves with end_date <= this date"),
 *   @OA\Parameter(name="overlap_from", in="query", @OA\Schema(type="string", format="date"), description="Filter leaves that overlap with this start date"),
 *   @OA\Parameter(name="overlap_to", in="query", @OA\Schema(type="string", format="date"), description="Filter leaves that overlap with this end date"),
 *   @OA\Parameter(name="leave_type_id", in="query", @OA\Schema(type="integer"), description="Filter by leave type ID"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15), description="Items per page (1-100)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Employee leaves retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/LeaveResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=404, description="Employee not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
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
