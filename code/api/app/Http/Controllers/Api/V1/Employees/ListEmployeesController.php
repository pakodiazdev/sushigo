<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\ListEmployeesRequest;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Employee;

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
    public function __invoke(ListEmployeesRequest $request): ResponsePaginated
    {
        $query = Employee::with(['user', 'roles']);

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('role')) {
            $query->role($request->role);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ILIKE', "%{$search}%")
                    ->orWhere('first_name', 'ILIKE', "%{$search}%")
                    ->orWhere('last_name', 'ILIKE', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 15);
        $employees = $query->orderBy('code')->paginate($perPage);

        $employees->getCollection()->transform(fn ($employee) => $employee->toApiArray());

        return new ResponsePaginated(paginator: $employees);
    }
}
