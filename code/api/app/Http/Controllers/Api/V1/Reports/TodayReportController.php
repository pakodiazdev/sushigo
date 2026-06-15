<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\TodayReportRequest;
use App\Http\Responses\Reports\TodayReportResponse;
use App\Repositories\EmployeeRepository;
use App\Services\Reports\TodayReportService;
use Carbon\Carbon;

/**
 * GET /api/v1/reports/today?branch_id=
 *
 * Returns a consolidated operational report for today showing each active
 * branch employee's status, tardiness, and overtime flags.
 *
 * Operational statuses:
 *   - arrived    : has check-in and entry_late_seconds == 0
 *   - late       : has check-in and entry_late_seconds > 0
 *   - not_arrived: no attendance record or no check-in (and not day_off / on_leave)
 *   - on_leave   : has an approved leave covering today
 *   - day_off    : attendance record with day_status = DAY_OFF
 *
 * Summary totals:
 *   - total_employees : count of all active employees in the branch
 *   - arrived         : count of employees with arrived or late status
 *   - not_arrived     : count of employees with not_arrived, on_leave, or day_off status
 *   - late_count      : count of employees with late status
 *
 * @OA\Get(
 *     path="/api/v1/reports/today",
 *     summary="Today's operational report",
 *     tags={"Reports"},
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
 *         description="Today's operational report",
 *
 *         @OA\JsonContent(ref="#/components/schemas/TodayReportResponse")
 *     ),
 *
 *     @OA\Response(response=422, description="Validation error (branch_id missing or invalid)"),
 *     @OA\Response(response=401, description="Unauthenticated")
 * )
 */
class TodayReportController extends Controller
{
    public function __construct(
        private EmployeeRepository $employeeRepository,
        private TodayReportService $reportService,
    ) {}

    public function __invoke(TodayReportRequest $request): TodayReportResponse
    {
        $branchId = (int) $request->input('branch_id');
        $today = Carbon::today(config('app.business_timezone'))->toDateString();

        $employees = $this->employeeRepository->getActiveForReport($branchId, $today);

        $rows = $this->reportService->buildEmployeeRows($employees);
        $summary = $this->reportService->computeSummary($rows);

        return new TodayReportResponse($summary, $rows);
    }
}
