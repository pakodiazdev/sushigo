<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\ListEmployeesRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Employee;
use App\Repositories\EmployeeRepository;

/**
 * @OA\Get(
 *   path="/api/v1/employees",
 *   summary="List Employees",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="role", in="query", @OA\Schema(type="string", enum={"employee-manager", "employee-cook", "employee-kitchen-assistant", "employee-delivery-driver", "employee-acting-manager"})),
 *   @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
 *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15)),
 *   @OA\Parameter(name="sort[]", in="query", @OA\Schema(type="array", @OA\Items(type="string", example="code:asc")), description="Sort fields (field:direction)"),
 *   @OA\Response(
 *       response=200,
 *       description="Employees retrieved successfully",
 *       @OA\JsonContent(
 *           allOf={
 *              @OA\Schema(ref="#/components/schemas/ResponsePaginated"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/EmployeeResponse")))
 *           }
 *       )
 *   )
 * )
 */
class ListEmployeesController extends Controller
{
    public function __invoke(ListEmployeesRequest $request, EmployeeRepository $employeesRepo): ResponsePaginated
    {
        $filters = [
            'is_active' => $request->filled('is_active') ? $request->boolean('is_active') : null,
            'role' => $request->filled('role') ? $request->role : null,
            'search' => $request->filled('search') ? $request->search : null,
        ];

        $perPage = $request->input('per_page', 15);

        // Parse sorts using request helper and pass to repository
        $sorts = $request->parseSorts();

        $employees = $employeesRepo->paginateIndex($filters, $sorts, $perPage);

        $employees->getCollection()->transform(fn($employee) => $employee->toApiArray());

        return new ResponsePaginated(paginator: $employees);
    }
}
