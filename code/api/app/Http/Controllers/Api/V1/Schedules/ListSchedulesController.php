<?php

namespace App\Http\Controllers\Api\V1\Schedules;

use App\Http\Controllers\Controller;
use App\Http\Resources\Schedule\ScheduleHistoryResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\EmploymentPeriod;

/**
 * @OA\Get(
 *   path="/api/v1/employment-periods/{employmentPeriod}/schedules",
 *   summary="List Schedule History",
 *   description="Returns all schedules for the employment period, ordered by effective_from DESC. Each schedule includes its days and the overrides that were active during its effective range.",
 *   tags={"Schedules"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employmentPeriod", in="path", required=true, description="Employment Period ULID", @OA\Schema(type="string")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Schedule history retrieved",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/ScheduleHistoryResponse")))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=404, description="Employment period not found"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class ListSchedulesController extends Controller
{
    public function __invoke(EmploymentPeriod $employmentPeriod): ResponseEntity
    {
        $schedules = $employmentPeriod
            ->employeeSchedules()
            ->with('scheduleDays')
            ->orderBy('effective_from', 'desc')
            ->get();

        // Load all overrides for the period once (to be filtered per schedule in the resource)
        $employmentPeriod->load('scheduleDayOverrides');

        // Attach the employment period to each schedule so the resource can access overrides
        $schedules->each(fn ($schedule) => $schedule->setRelation('employmentPeriod', $employmentPeriod));

        return new ResponseEntity(
            data: ScheduleHistoryResource::collection($schedules)->resolve()
        );
    }
}
