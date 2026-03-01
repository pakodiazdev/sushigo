<?php

namespace App\Http\Controllers\Api\V1\Schedules;

use App\Actions\Schedule\CreateScheduleAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Schedules\StoreScheduleRequest;
use App\Http\Resources\Schedule\ScheduleResource;
use App\Models\EmploymentPeriod;

/**
 * @OA\Post(
 *   path="/api/v1/employment-periods/{employmentPeriod}/schedules",
 *   summary="Create Schedule",
 *   tags={"Schedules"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employmentPeriod", in="path", required=true, description="Employment period ULID", @OA\Schema(type="string")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreScheduleRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Schedule created",
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
 *   @OA\Response(response=404, description="Employment period not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError"))
 * )
 */
class CreateScheduleController extends Controller
{
    public function __invoke(
        StoreScheduleRequest $request,
        EmploymentPeriod $employmentPeriod,
        CreateScheduleAction $action,
    ): ScheduleResource {
        $schedule = $action($employmentPeriod, $request->validated());

        return (new ScheduleResource($schedule))->setStatusCode(201);
    }
}
