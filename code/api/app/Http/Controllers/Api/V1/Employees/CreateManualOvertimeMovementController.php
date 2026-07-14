<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Actions\Employee\CreateManualOvertimeMovementAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\StoreManualOvertimeMovementRequest;
use App\Http\Resources\Employees\OvertimeBankMovementResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;

/**
 * @OA\Post(
 *   path="/api/v1/employees/{employee}/overtime-bank/movements",
 *   summary="Register a manual USED or ADJUSTMENT overtime bank movement",
 *   tags={"Employees"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employee", in="path", required=true, @OA\Schema(type="string"), description="Employee public_id (ULID)"),
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(
 *       required={"date", "movement_type", "minutes", "reason"},
 *
 *       @OA\Property(property="date", type="string", format="date"),
 *       @OA\Property(property="movement_type", type="string", enum={"USED", "ADJUSTMENT"}),
 *       @OA\Property(property="minutes", type="integer"),
 *       @OA\Property(property="reason", type="string")
 *     )
 *   ),
 *
 *   @OA\Response(response=201, description="Movement created"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class CreateManualOvertimeMovementController extends Controller
{
    public function __invoke(
        StoreManualOvertimeMovementRequest $request,
        Employee $employee,
        CreateManualOvertimeMovementAction $action
    ): ResponseEntity {
        $movement = ($action)($employee, $request->manualMovementData(), $request->user());

        return new ResponseEntity(data: (new OvertimeBankMovementResource($movement))->toArray($request), status: 201);
    }
}
