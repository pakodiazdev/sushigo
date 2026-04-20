<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\TodayAttendanceRequest;
use App\Http\Resources\Attendance\AttendanceResource;
use App\Http\Resources\Employee\EmployeeSummaryResource;
use App\Http\Resources\Leave\TodayLeaveResource;
use App\Http\Resources\Schedule\ScheduleDayResource;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\Leave;
use App\Models\ScheduleDay;
use App\Models\ScheduleDayOverride;
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
 *
 *     @OA\Parameter(
 *         name="branch_id",
 *         in="query",
 *         required=true,
 *         description="Branch ID to filter active employees",
 *
 *         @OA\Schema(type="integer", example=1)
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Today attendance list",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="status", type="integer", example=200),
 *             @OA\Property(
 *                 property="data",
 *                 type="array",
 *
 *                 @OA\Items(
 *
 *                     @OA\Property(property="employee", ref="#/components/schemas/EmployeeSummaryResponse"),
 *                     @OA\Property(property="attendance", nullable=true, ref="#/components/schemas/AttendanceResponse"),
 *                     @OA\Property(property="schedule", nullable=true, ref="#/components/schemas/ScheduleDayResponse"),
 *                     @OA\Property(property="today_leave", nullable=true, ref="#/components/schemas/TodayLeaveResponse")
 *                 )
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=422, description="Validation error (branch_id missing or invalid)"),
 *     @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class TodayAttendanceController extends Controller
{
    public function __invoke(TodayAttendanceRequest $request): ResponseEntity
    {
        $branchId = (int) $request->input('branch_id');
        // Use business timezone to match the local date used when check-ins are recorded.
        // See config/app.php 'business_timezone' for documentation.
        $today = Carbon::today(config('app.business_timezone'))->toDateString();

        // Fetch all active employees for the branch (via active employment period)
        // and eager-load today's attendance (if any) and any approved leave covering
        // today in a single query.
        $employees = Employee::with([
            'user.roles',
            'attendances' => fn ($q) => $q->whereDate('date', $today),
            // Pick only the first approved leave covering today.
            // reorder() clears the default orderBy('start_date', 'desc') inherited from
            // Employee::leaves(), then oldest('id') applies a stable, predictable tie-break.
            'leaves' => fn ($q) => $q
                ->approved()
                ->forDate($today)
                ->with('leaveType')
                ->reorder()
                ->oldest('id'),
            // Load the wage record effective today to compute the daily wage shown in the
            // ExtraDayNegotiationDialog. Only the most recent effective record is needed.
            'wageHistories' => fn ($q) => $q->effective($today)->latest('effective_from'),
        ])
            ->whereHas('employmentPeriods', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                    ->where('is_active', true);
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $dayOfWeekIso = Carbon::parse($today)->dayOfWeekIso;

        // Pre-load schedule days for today's day-of-week in a single pass.
        // For each employee: active period → effective schedule → schedule day.
        $scheduleDaysByEmployee = $this->resolveScheduleDays($employees, $today, $dayOfWeekIso);

        $data = $employees->map(function (Employee $employee) use ($scheduleDaysByEmployee, $today) {
            /** @var Attendance|null $attendance */
            $attendance = $employee->attendances->first();

            // Set the employee relation so AttendanceResource always returns the ULID
            // instead of the raw integer FK (avoids N+1 and fixes the API contract)
            $attendance?->setRelation('employee', $employee);

            $scheduleDay = $scheduleDaysByEmployee[$employee->id] ?? null;

            /** @var Leave|null $todayLeave */
            $todayLeave = $employee->leaves->first();

            return [
                'employee' => (new EmployeeSummaryResource($employee))->resolve(),
                'attendance' => $attendance
                    ? (new AttendanceResource($attendance))->resolve()
                    : null,
                'schedule' => $scheduleDay
                    ? (new ScheduleDayResource($scheduleDay))->resolve()
                    : null,
                'today_leave' => $todayLeave
                    ? (new TodayLeaveResource($todayLeave, $today))->resolve()
                    : null,
            ];
        });

        return new ResponseEntity(data: $data->values()->all(), status: 200);
    }

    /**
     * Resolve today's ScheduleDay for each employee in a batch-friendly way.
     *
     * Returns an array keyed by employee internal ID → ScheduleDay|null.
     * Non-blocking: employees without an active period, schedule, or day config
     * simply get null (the frontend will handle the absence of schedule data).
     *
     * @param  \Illuminate\Support\Collection<Employee>  $employees
     * @return array<int, ScheduleDay|null>
     */
    private function resolveScheduleDays($employees, string $today, int $dayOfWeekIso): array
    {
        $result = [];

        // Step 1: Get active employment periods for all employees in one query
        $periods = EmploymentPeriod::whereIn('employee_id', $employees->pluck('id'))
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $today);
            })
            ->get()
            ->keyBy('employee_id');

        if ($periods->isEmpty()) {
            return $result;
        }

        // Step 2: Get effective schedules for all periods in one query
        $schedules = EmployeeSchedule::effective($today)
            ->whereIn('employment_period_id', $periods->pluck('id'))
            ->get()
            ->keyBy('employment_period_id');

        if ($schedules->isEmpty()) {
            return $result;
        }

        // Step 3: Get schedule days for today's day-of-week in one query
        $scheduleDays = ScheduleDay::whereIn('employee_schedule_id', $schedules->pluck('id'))
            ->where('day_of_week', $dayOfWeekIso)
            ->get()
            ->keyBy('employee_schedule_id');

        // Step 3b: Get ScheduleDayOverrides effective today — override takes full precedence.
        // Keyed by "{employment_period_id}:{day_of_week}" for O(1) lookup.
        $overrides = ScheduleDayOverride::effective($today)
            ->whereIn('employment_period_id', $periods->pluck('id'))
            ->where('day_of_week', $dayOfWeekIso)
            ->get()
            ->keyBy(fn ($o) => "{$o->employment_period_id}:{$o->day_of_week}");

        // Step 4: Map back to employee IDs, preferring override over base schedule day
        foreach ($employees as $employee) {
            $period = $periods[$employee->id] ?? null;
            if (! $period) {
                continue;
            }

            $schedule = $schedules[$period->id] ?? null;
            if (! $schedule) {
                continue;
            }

            $overrideKey = "{$period->id}:{$dayOfWeekIso}";
            $result[$employee->id] = $overrides[$overrideKey] ?? $scheduleDays[$schedule->id] ?? null;
        }

        return $result;
    }
}
