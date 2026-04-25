<?php

namespace App\Http\Controllers\Api\V1\EmployeeRequests;

use App\Http\Controllers\Controller;
use App\Http\Requests\EmployeeRequests\ApproveEmployeeRequestRequest;
use App\Http\Resources\EmployeeRequest\EmployeeRequestResource;
use App\Models\EmployeeRequest;
use App\Services\EmployeeRequests\EmployeeRequestService;

/**
 * @OA\Patch(
 *   path="/api/v1/employee-requests/{id}/approve",
 *   summary="Approve Employee Request",
 *   description="Approves a pending employee request and creates the concrete entity.",
 *   tags={"EmployeeRequests"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string"), description="EmployeeRequest public_id (ULID)"),
 *
 *   @OA\RequestBody(
 *       required=false,
 *
 *       @OA\JsonContent(
 *
 *           @OA\Property(property="salary_pct", type="number", nullable=true, example=100, description="Override: salary as % of daily wage (0–100)"),
 *           @OA\Property(property="salary_day", type="number", nullable=true, example=200.00, description="Override: computed salary day amount"),
 *           @OA\Property(property="prima_pct", type="number", nullable=true, example=100, description="Override: prima percentage (0–200)"),
 *           @OA\Property(property="prima", type="number", nullable=true, example=200.00, description="Override: computed prima amount"),
 *           @OA\Property(property="seventh_day", type="number", nullable=true, example=200.00, description="Override: seventh-day bonus amount"),
 *           @OA\Property(property="total", type="number", nullable=true, example=600.00, description="Override: total amount"),
 *           @OA\Property(property="notes", type="string", nullable=true, example="Acuerdo ajustado", description="Manager note for the employee")
 *       )
 *   ),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Employee request approved",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/EmployeeRequestResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=404, description="Not Found", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class ApproveEmployeeRequestController extends Controller
{
    public function __invoke(
        ApproveEmployeeRequestRequest $request,
        string $id,
        EmployeeRequestService $service,
    ): EmployeeRequestResource {
        $employeeRequest = EmployeeRequest::query()->where('public_id', $id)->firstOrFail();
        $overrides = array_filter($request->validated(), fn ($v) => $v !== null);
        $employeeRequest = $service->approve($employeeRequest, $request->user(), empty($overrides) ? null : $overrides);

        return new EmployeeRequestResource($employeeRequest);
    }
}
