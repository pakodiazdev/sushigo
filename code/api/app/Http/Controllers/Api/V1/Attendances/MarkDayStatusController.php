<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Actions\Attendances\MarkDayStatusAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\DayStatusRequest;
use App\Http\Resources\Attendance\AttendanceResource;

/**
 * @OA\Post(
 *   path="/api/v1/attendances/day-status",
 *   summary="Mark a day as Day-Off or Absence",
 *   description="Creates an attendance record for an employee with DAY_OFF or ABSENCE status, without check-in or check-out times. Returns 422 if an attendance record already exists for that employee/date.",
 *   tags={"Attendances"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(
 *       required=true,
 *
 *       @OA\JsonContent(ref="#/components/schemas/DayStatusRequest")
 *   ),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Day status marked successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *               @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *               @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/AttendanceResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class MarkDayStatusController extends Controller
{
    public function __invoke(
        DayStatusRequest $request,
        MarkDayStatusAction $action
    ): AttendanceResource {
        $attendance = $action($request->validated());

        return (new AttendanceResource($attendance))->setStatusCode(201);
    }
}
