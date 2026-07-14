<?php

namespace App\Http\Controllers\Api\V1\Schedules;

use App\Actions\Schedule\UpdateScheduleAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Schedules\UpdateScheduleRequest;
use App\Http\Resources\Schedule\ScheduleResource;
use App\Models\EmployeeSchedule;

/**
 * @OA\Put(
 *   path="/api/v1/schedules/{schedule}",
 *   summary="Update Current Schedule",
 *   description="Updates the currently active schedule in place. Fails with 422 when the schedule is closed (has an effective_to).",
 *   tags={"Schedules"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="schedule", in="path", required=true, description="Schedule ULID", @OA\Schema(type="string")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/UpdateScheduleRequest")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Schedule updated",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ScheduleResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=404, description="Schedule not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class UpdateScheduleController extends Controller
{
    public function __invoke(
        UpdateScheduleRequest $request,
        EmployeeSchedule $schedule,
        UpdateScheduleAction $action,
    ): ScheduleResource {
        $schedule = $action($schedule, $request->validated());

        return new ScheduleResource($schedule);
    }
}
