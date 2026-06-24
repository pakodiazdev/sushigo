<?php

namespace App\Http\Controllers\Api\V1\PayPeriods;

use App\Http\Controllers\Controller;
use App\Http\Requests\PayPeriods\PreviewPayPeriodRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\PunctualityRange;
use App\Services\PayPeriodPreviewService;

/**
 * @OA\Get(
 *   path="/api/v1/pay-periods/preview",
 *   summary="Preview weekly payroll close",
 *   description="Calculates payroll totals for all active employees of a branch in the given period. Does not persist any data.",
 *   tags={"PayPeriods"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="branch_id", in="query", required=true, @OA\Schema(type="integer")),
 *   @OA\Parameter(name="period_start", in="query", required=true, @OA\Schema(type="string", format="date", example="2026-06-22")),
 *   @OA\Parameter(name="period_end", in="query", required=true, @OA\Schema(type="string", format="date", example="2026-06-28")),
 *
 *   @OA\Response(response=200, description="Preview calculated successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error")
 * )
 */
class PreviewPayPeriodController extends Controller
{
    public function __construct(private PayPeriodPreviewService $previewService) {}

    public function __invoke(PreviewPayPeriodRequest $request): ResponseEntity
    {
        $branchId = $request->branchId();
        $periodStart = $request->periodStart();
        $periodEnd = $request->periodEnd();

        $employees = Employee::with(['employmentPeriods'])
            ->whereHas('employmentPeriods', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)->where('is_active', true);
            })
            ->where('is_active', true)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $holidays = Holiday::whereBetween('date', [$periodStart, $periodEnd])->get();
        $punctualityRanges = PunctualityRange::orderBy('sort_order')->get();

        $data = $employees->map(
            fn (Employee $employee) => $this->previewService->buildEmployeePreview($employee, $periodStart, $periodEnd, $holidays, $punctualityRanges)
        )->values()->all();

        return new ResponseEntity(data: $data);
    }
}
