<?php

namespace App\Http\Controllers\Api\V1\PayPeriods;

use App\Actions\Payroll\RecalculatePayPeriodEmployeesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\PayPeriods\ConfirmClosePayPeriodRequest;
use App\Http\Responses\Common\ResponseEntity;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\PayPeriod;
use App\Models\PunctualityRange;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Post(
 *   path="/api/v1/pay-periods",
 *   summary="Confirm weekly payroll close",
 *   description="Calculates and persists payroll totals for all active employees of a branch in the given period, freezing the PayPeriod as CLOSED.",
 *   tags={"PayPeriods"},
 *   security={{"passport": {}}},
 *
 *   @OA\RequestBody(
 *     required=true,
 *
 *     @OA\JsonContent(
 *       required={"branch_id", "period_start", "period_end"},
 *
 *       @OA\Property(property="branch_id", type="integer"),
 *       @OA\Property(property="period_start", type="string", format="date", example="2026-06-22"),
 *       @OA\Property(property="period_end", type="string", format="date", example="2026-06-28")
 *     )
 *   ),
 *
 *   @OA\Response(response=201, description="Pay period closed successfully"),
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=422, description="Validation error or duplicate period")
 * )
 *
 * @throws ValidationException
 */
class ConfirmCloseController extends Controller
{
    private const DUPLICATE_PERIOD_MESSAGE = 'Ya existe un cierre para este periodo.';

    private const REOPENED_PERIOD_MESSAGE = "Este periodo fue reabierto — usa 'Volver a cerrar' para cerrarlo nuevamente.";

    public function __construct(
        private RecalculatePayPeriodEmployeesAction $recalculate,
    ) {}

    public function __invoke(ConfirmClosePayPeriodRequest $request): ResponseEntity
    {
        $branchId = $request->branchId();
        $periodStart = $request->periodStart();
        $periodEnd = $request->periodEnd();

        $existingPeriod = PayPeriod::where('branch_id', $branchId)
            ->where('period_start', $periodStart)
            ->where('period_end', $periodEnd)
            ->first();

        if ($existingPeriod?->status === PayPeriod::STATUS_REOPENED) {
            throw ValidationException::withMessages([
                'period_start' => self::REOPENED_PERIOD_MESSAGE,
            ]);
        }

        if ($existingPeriod?->status === PayPeriod::STATUS_CLOSED) {
            throw ValidationException::withMessages([
                'period_start' => self::DUPLICATE_PERIOD_MESSAGE,
            ]);
        }

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

        try {
            $payPeriod = DB::transaction(function () use ($employees, $branchId, $periodStart, $periodEnd, $holidays, $punctualityRanges, $request) {
                $payPeriod = PayPeriod::create([
                    'branch_id' => $branchId,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'status' => PayPeriod::STATUS_CLOSED,
                    'closed_by' => $request->user()->id,
                    'closed_at' => now(),
                ]);

                ($this->recalculate)($payPeriod, $employees, $holidays, $punctualityRanges);

                return $payPeriod;
            });
        } catch (UniqueConstraintViolationException) {
            // The pre-check above is a TOCTOU race: a concurrent request can pass it before either
            // transaction commits. The unique index on (branch_id, period_start, period_end) is the
            // actual guarantee — surface it as the same friendly validation error.
            throw ValidationException::withMessages([
                'period_start' => self::DUPLICATE_PERIOD_MESSAGE,
            ]);
        }

        return new ResponseEntity(data: [
            'pay_period' => [
                'id' => $payPeriod->public_id,
                'branch_id' => $payPeriod->branch_id,
                'period_start' => $payPeriod->period_start->toDateString(),
                'period_end' => $payPeriod->period_end->toDateString(),
                'status' => $payPeriod->status,
                'closed_at' => $payPeriod->closed_at->toIso8601String(),
            ],
            'employees_closed' => $employees->count(),
        ], status: 201);
    }
}
