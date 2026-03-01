<?php

namespace App\Http\Controllers\Api\V1\Schedules;

use App\Http\Controllers\Controller;
use App\Http\Resources\Schedule\ScheduleResource;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Get(
 *   path="/api/v1/employees/{employee}/current-schedule",
 *   summary="Get Current Schedule",
 *   description="Returns the schedule that is currently effective for the employee's active employment period. Returns 404 when no active period or no current schedule exists.",
 *   tags={"Schedules"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="employee", in="path", required=true, description="Employee ULID", @OA\Schema(type="string")),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Current schedule retrieved",
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
 *   @OA\Response(response=404, description="No active schedule found"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class CurrentScheduleController extends Controller
{
    public function __invoke(Employee $employee): ScheduleResource|JsonResponse
    {
        $activePeriod = $employee->employmentPeriods()->active()->first();

        if (! $activePeriod) {
            return response()->json([
                'message' => 'No active employment period found for this employee.',
                'status' => 404,
            ], 404);
        }

        $schedule = EmployeeSchedule::effective(now())
            ->where('employment_period_id', $activePeriod->id)
            ->with('scheduleDays')
            ->first();

        if (! $schedule) {
            return response()->json([
                'message' => 'No active schedule found for this employee.',
                'status' => 404,
                'meta' => ['employment_period_id' => $activePeriod->public_id],
            ], 404);
        }

        return new ScheduleResource($schedule);
    }
}
