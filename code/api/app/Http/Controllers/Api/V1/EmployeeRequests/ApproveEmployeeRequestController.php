<?php

namespace App\Http\Controllers\Api\V1\EmployeeRequests;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeRequest\EmployeeRequestResource;
use App\Models\EmployeeRequest;
use App\Services\EmployeeRequests\EmployeeRequestService;
use Illuminate\Http\Request;

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
        Request $request,
        string $id,
        EmployeeRequestService $service,
    ): EmployeeRequestResource {
        $employeeRequest = EmployeeRequest::query()->where('public_id', $id)->firstOrFail();
        $employeeRequest = $service->approve($employeeRequest, $request->user());

        return new EmployeeRequestResource($employeeRequest);
    }
}
