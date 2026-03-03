<?php

namespace App\Http\Controllers\Api\V1\Schedules;

use App\Actions\Schedule\CreateScheduleDayOverrideAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Schedules\StoreScheduleDayOverrideRequest;
use App\Http\Resources\Schedule\ScheduleDayOverrideResource;
use App\Models\EmploymentPeriod;

/**
 * @OA\Post(
 *   path="/api/v1/employment-periods/{employmentPeriod}/schedule-day-overrides",
 *   summary="Create Schedule Day Override",
 *   description="Creates a temporary exception for a specific day of the week within an employment period. The override replaces the base schedule times for the given day_of_week on dates within the effective range.",
 *   tags={"Schedules"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employmentPeriod", in="path", required=true, description="Employment period ULID", @OA\Schema(type="string")),
 *
 *   @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/StoreScheduleDayOverrideRequest")),
 *
 *   @OA\Response(
 *       response=201,
 *       description="Override created",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/ScheduleDayOverrideResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=404, description="Employment period not found"),
 *   @OA\Response(response=422, description="Validation Error", @OA\JsonContent(ref="#/components/schemas/ResponseError")),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class CreateScheduleDayOverrideController extends Controller
{
    public function __invoke(
        StoreScheduleDayOverrideRequest $request,
        EmploymentPeriod $employmentPeriod,
        CreateScheduleDayOverrideAction $action,
    ): ScheduleDayOverrideResource {
        $override = $action($employmentPeriod, $request->validated());

        return (new ScheduleDayOverrideResource($override))->setStatusCode(201);
    }
}
