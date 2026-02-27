<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\TodayAttendanceRequest;
use App\Http\Resources\Attendance\AttendanceResource;
use App\Http\Resources\Employee\EmployeeSummaryResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;

/**
 * GET /api/v1/attendances/today?branch_id=
 *
 * Returns all active employees for the given branch alongside their
 * attendance record for today (null when none has been registered yet).
 *
 * Response shape per row:
 * {
 *   "employee":   EmployeeSummaryResource  { id, code, first_name, last_name, roles },
 *   "attendance":  AttendanceResource | null
 * }
 *
 * Employees are ordered by last_name ASC, first_name ASC.
 *
 * @OA\Get(
 *     path="/api/v1/attendances/today",
 *     summary="Today attendance view",
 *     tags={"Attendances"},
 *     security={{"passport":{}}},
 *     @OA\Parameter(
 *         name="branch_id",
 *         in="query",
 *         required=true,
 *         description="Branch ID to filter active employees",
 *         @OA\Schema(type="integer", example=1)
 *     ),
 *     @OA\Response(
 *         response=200,
 *         description="Today attendance list",
 *         @OA\JsonContent(
 *             @OA\Property(property="status", type="integer", example=200),
 *             @OA\Property(
 *                 property="data",
 *                 type="array",
 *                 @OA\Items(
 *                     @OA\Property(property="employee", ref="#/components/schemas/EmployeeSummaryResponse"),
 *                     @OA\Property(property="attendance", nullable=true, ref="#/components/schemas/AttendanceResponse")
 *                 )
 *             )
 *         )
 *     ),
 *     @OA\Response(response=422, description="Validation error (branch_id missing or invalid)"),
 *     @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class TodayAttendanceController extends Controller
{
    public function __invoke(TodayAttendanceRequest $request): ResponseEntity
    {
        $branchId = (int) $request->input('branch_id');
        $today    = Carbon::today(config('app.timezone'))->toDateString();

        // Fetch all active employees for the branch (via active employment period)
        // and eager-load today's attendance (if any) in a single query.
        $employees = Employee::with([
                'user.roles',
                'attendances' => fn ($q) => $q->whereDate('date', $today),
            ])
            ->whereHas('employmentPeriods', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                    ->where('is_active', true);
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $data = $employees->map(function (Employee $employee) {
            /** @var Attendance|null $attendance */
            $attendance = $employee->attendances->first();

            // Set the employee relation so AttendanceResource always returns the ULID
            // instead of the raw integer FK (avoids N+1 and fixes the API contract)
            $attendance?->setRelation('employee', $employee);

            return [
                'employee'   => (new EmployeeSummaryResource($employee))->resolve(),
                'attendance' => $attendance
                    ? (new AttendanceResource($attendance))->resolve()
                    : null,
            ];
        });

        return new ResponseEntity(data: $data->values()->all(), status: 200);
    }
}
