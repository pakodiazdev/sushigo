<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Enums\VacationRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\VacationRequests\VacationRequestResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @OA\Get(
 *   path="/api/v1/employees/{employee}/vacation-requests",
 *   summary="List Employee Vacation Requests",
 *   description="Returns a paginated list of vacation requests for a specific employee. Supports filtering by status.",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employee", in="path", required=true, @OA\Schema(type="string"), description="Employee public_id (ULID)"),
 *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"PENDING", "APPROVED", "REJECTED", "CANCELLED"}), description="Filter by vacation request status"),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15), description="Items per page (1-100)"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Employee vacation requests retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/VacationRequestResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=404, description="Employee not found", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ListEmployeeVacationRequestsController extends Controller
{
    public function __invoke(Request $request, Employee $employee): ResponsePaginated
    {
        $user = $request->user();
        abort_unless($user->can('employees.view') || $employee->user_id === $user->id, 403);

        $validated = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(array_column(VacationRequestStatus::cases(), 'value'))],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $employee->vacationRequests()
            ->with(['vacationEntitlement', 'requestedBy', 'approvedBy', 'employee']);

        if (array_key_exists('status', $validated)) {
            $query->where('status', $validated['status']);
        }

        $perPage = (int) ($validated['per_page'] ?? 15);

        $vacationRequests = $query->paginate($perPage);

        $vacationRequests->getCollection()->transform(fn ($vacationRequest) => (new VacationRequestResource($vacationRequest))->resolve());

        return new ResponsePaginated(paginator: $vacationRequests);
    }
}
