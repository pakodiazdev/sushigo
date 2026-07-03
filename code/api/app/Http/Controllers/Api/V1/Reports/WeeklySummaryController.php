<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\WeeklySummaryRequest;
use App\Http\Responses\Reports\WeeklySummaryResponse;
use App\Services\WeeklySummaryService;

/**
 * GET /api/v1/reports/weekly-summary
 *
 * Returns the complete financial breakdown for one employee in a period.
 * Calculates live (no closed-period snapshot required).
 *
 * Query params:
 *   employee_id  — Employee public_id (ULID)
 *   period_start — YYYY-MM-DD
 *   period_end   — YYYY-MM-DD
 */
class WeeklySummaryController extends Controller
{
    public function __construct(private WeeklySummaryService $weeklySummaryService) {}

    public function __invoke(WeeklySummaryRequest $request): WeeklySummaryResponse
    {
        $summary = $this->weeklySummaryService->buildSummary(
            $request->employee(),
            $request->validated('period_start'),
            $request->validated('period_end'),
        );

        return new WeeklySummaryResponse($summary);
    }
}
