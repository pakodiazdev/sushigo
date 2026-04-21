<?php

namespace App\Http\Controllers\Api\V1\EmployeeRequests;

use App\Http\Controllers\Controller;
use App\Http\Requests\EmployeeRequests\ListEmployeeRequestsRequest;
use App\Http\Resources\EmployeeRequest\EmployeeRequestResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Employee;
use App\Models\EmployeeRequest;

/**
 * @OA\Get(
 *   path="/api/v1/employee-requests",
 *   summary="List Employee Requests",
 *   tags={"EmployeeRequests"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employee_id", in="query", @OA\Schema(type="string"), description="Employee public_id (ULID)"),
 *   @OA\Parameter(name="type", in="query", @OA\Schema(type="string", enum={"EXTRA_DAY", "LEAVE", "VACATION", "SCHEDULE_CHANGE"})),
 *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"PENDING", "APPROVED", "REJECTED"})),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15)),
 *   @OA\Parameter(name="sort[]", in="query", @OA\Schema(type="array", @OA\Items(type="string", example="created_at:desc"))),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Employee requests retrieved successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/EmployeeRequestResponse")))
 *           }
 *       )
 *   )
 * )
 */
class ListEmployeeRequestsController extends Controller
{
    public function __invoke(ListEmployeeRequestsRequest $request): ResponsePaginated
    {
        $query = EmployeeRequest::query()->with(['employee', 'requestable', 'requestedBy', 'approvedBy']);

        if ($request->filled('employee_id')) {
            $employee = Employee::query()->where('public_id', $request->input('employee_id'))->firstOrFail();
            $query->where('employee_id', $employee->id);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $request->applySorts($query);

        $perPage = (int) $request->input('per_page', 15);
        $employeeRequests = $query->paginate($perPage);

        $employeeRequests->getCollection()->transform(
            fn (EmployeeRequest $employeeRequest) => (new EmployeeRequestResource($employeeRequest))->resolve()
        );

        return new ResponsePaginated($employeeRequests);
    }
}
