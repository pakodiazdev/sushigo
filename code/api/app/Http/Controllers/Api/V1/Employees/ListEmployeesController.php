<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\ListEmployeesRequest;
use App\Http\Resources\Employee\EmployeeResource;
use App\Http\Responses\Common\ResponsePaginated;
use App\Models\Employee;

/**
 * @OA\Get(
 *   path="/api/v1/employees",
 *   summary="List Employees",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *   @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
 *   @OA\Parameter(name="role", in="query", @OA\Schema(type="string", enum={"manager", "cook", "kitchen-assistant", "delivery-driver", "acting-manager"})),
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
    public function __invoke(ListEmployeesRequest $request): ResponsePaginated
    {
        $query = Employee::with(['user.roles'])
            ->withCount(['employmentPeriods as active_employment_periods_count' => function ($q) {
                $q->where('is_active', true);
            }]);

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->input('status') === 'baja') {
            $query->whereDoesntHave('employmentPeriods', fn($q) => $q->where('is_active', true));
        }

        if ($request->filled('role')) {
            $query->whereHas('user', fn($q) => $q->role($request->role));
        }

        if ($request->filled('search')) {
            $search = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $request->search);
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ILIKE', "%{$search}%")
                    ->orWhere('first_name', 'ILIKE', "%{$search}%")
                    ->orWhere('last_name', 'ILIKE', "%{$search}%");
            });
        }

        $request->applySorts($query);

        $perPage = $request->input('per_page', 15);

        $employees = $query->paginate($perPage);

        $employees->getCollection()->transform(fn ($employee) => (new EmployeeResource($employee))->resolve());

        return new ResponsePaginated(paginator: $employees);
    }
}
