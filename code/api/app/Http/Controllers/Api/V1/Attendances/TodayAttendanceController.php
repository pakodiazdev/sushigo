<?php

namespace App\Http\Controllers\Api\V1\Attendances;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendances\TodayAttendanceRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/v1/attendances/today?branch_id=
 *
 * Returns all active employees for the given branch alongside their
 * attendance record for today (null when none has been registered yet).
 *
 * Response shape per row:
 * {
 *   "employee": { id, code, first_name, last_name, roles },
 *   "attendance": { id, check_in, lunch_start, lunch_end, check_out,
 *                   day_status, entry_late_seconds, lunch_late_seconds,
 *                   overtime_minutes, requires_overtime_decision } | null
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
 *             @OA\Property(property="status", type="string", example="success"),
 *             @OA\Property(
 *                 property="data",
 *                 type="array",
 *                 @OA\Items(
 *                     @OA\Property(property="employee", ref="#/components/schemas/EmployeeResponse"),
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
        $today    = Carbon::today()->toDateString();

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

            return [
                'employee'   => $this->formatEmployee($employee),
                'attendance' => $attendance ? $this->formatAttendance($attendance) : null,
            ];
        });

        return new ResponseEntity(data: $data->values()->all(), status: 200);
    }

    // ── Private formatters ────────────────────────────────────────────────────

    private function formatEmployee(Employee $employee): array
    {
        return [
            'id'         => $employee->public_id,
            'code'       => $employee->code,
            'first_name' => $employee->first_name,
            'last_name'  => $employee->last_name,
            'roles'      => $employee->getPositionRoles(),
        ];
    }

    private function formatAttendance(Attendance $attendance): array
    {
        return [
            'id'                         => $attendance->public_id,
            'check_in'                   => $attendance->check_in?->toIso8601String(),
            'lunch_start'                => $attendance->lunch_start?->toIso8601String(),
            'lunch_end'                  => $attendance->lunch_end?->toIso8601String(),
            'check_out'                  => $attendance->check_out?->toIso8601String(),
            'day_status'                 => $attendance->day_status?->value,
            'entry_late_seconds'         => $attendance->entry_late_seconds ?? 0,
            'entry_late_minutes'         => $attendance->entryLateMinutes(),
            'is_entry_deductible'        => $attendance->isEntryLateDeductible(),
            'lunch_late_seconds'         => $attendance->lunch_late_seconds ?? 0,
            'lunch_late_minutes'         => $attendance->lunchLateMinutes(),
            'is_lunch_deductible'        => $attendance->isLunchLateDeductible(),
            'net_worked_minutes'         => $attendance->net_worked_minutes,
            'overtime_minutes'           => $attendance->overtime_minutes,
            'overtime_authorized'        => $attendance->overtime_authorized,
            'requires_overtime_decision' => ($attendance->overtime_minutes ?? 0) > 0 && ! $attendance->overtime_authorized,
        ];
    }
}
