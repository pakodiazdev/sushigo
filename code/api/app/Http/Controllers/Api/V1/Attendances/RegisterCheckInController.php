<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Actions\Attendances\RegisterCheckInAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\CheckInRequest;
use App\Http\Resources\Attendance\AttendanceResource;

/**
 * @OA\Post(
 *   path="/api/v1/attendances/check-in",
 *   summary="Register Employee Check-in",
 *   description="Records the employee's arrival time and calculates entry tardiness in seconds against the configured schedule. Returns 422 if the employee already has attendance for the day, has no active employment period, or has no schedule assigned for the date.",
 *   tags={"Attendances"},
 *   security={{"passport": {}}},
 *   @OA\RequestBody(
 *       required=true,
 *       @OA\JsonContent(ref="#/components/schemas/CheckInRequest")
 *   ),
 *   @OA\Response(
 *       response=201,
 *       description="Check-in registered successfully",
 *       @OA\JsonContent(
 *           allOf={
 *               @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *               @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/AttendanceResponse"))
 *           }
 *       )
 *   ),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class RegisterCheckInController extends Controller
{
    public function __invoke(
        CheckInRequest       $request,
        RegisterCheckInAction $action
    ): AttendanceResource {
        $attendance = $action($request->validated());

        return (new AttendanceResource($attendance))->setStatusCode(201);
    }
}
