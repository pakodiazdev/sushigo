<?php

namespace App\Http\Controllers\Api\V1\PayPeriods;

use App\Actions\Payroll\RecalculatePayPeriodEmployeesAction;
use App\Http\Controllers\Api\V1\PayPeriods\Concerns\LoadsPayPeriodEmployeeAvatarRelations;
use App\Http\Controllers\Controller;
use App\Http\Requests\PayPeriods\ReclosePayPeriodRequest;
use App\Http\Resources\PayPeriods\PayPeriodResource;
use App\Models\Holiday;
use App\Models\PayPeriod;
use App\Models\PayPeriodEmployee;
use App\Models\PunctualityRange;
use App\Repositories\EmployeeRepository;
use App\Support\Clock\ApplicationClock;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Patch(
 *   path="/api/v1/pay-periods/{payPeriod}/reclose",
 *   summary="Reclose a reopened pay period",
 *   description="Admin-only. Recalculates payroll totals for a REOPENED pay period from scratch and freezes it as CLOSED again. Reopening metadata (who/when/why) is preserved for the audit trail.",
 *   tags={"PayPeriods"},
 *   security={{"passport": {}}},
 *
 *   @OA\Parameter(name="payPeriod", in="path", required=true, @OA\Schema(type="string"), description="Public ID (ULID) of the pay period"),
 *
 *   @OA\Response(
 *       response=200,
 *       description="Pay period reclosed successfully",
 *
 *       @OA\JsonContent(
 *           allOf={
 *
 *              @OA\Schema(ref="#/components/schemas/ResponseEntity"),
 *              @OA\Schema(@OA\Property(property="data", ref="#/components/schemas/PayPeriodResponse"))
 *           }
 *       )
 *   ),
 *
 *   @OA\Response(response=401, description="Unauthenticated"),
 *   @OA\Response(response=403, description="Forbidden"),
 *   @OA\Response(response=404, description="Pay period not found"),
 *   @OA\Response(response=422, description="Period is not reopened")
 * )
 *
 * @throws ValidationException
 */
class ReclosePayPeriodController extends Controller
{
    use LoadsPayPeriodEmployeeAvatarRelations;

    public function __construct(
        private RecalculatePayPeriodEmployeesAction $recalculate,
        private EmployeeRepository $employeeRepository,
        private ApplicationClock $clock,
    ) {}

    public function __invoke(ReclosePayPeriodRequest $request, PayPeriod $payPeriod): PayPeriodResource
    {
        if ($payPeriod->status !== PayPeriod::STATUS_REOPENED) {
            throw ValidationException::withMessages([
                'status' => 'Solo se pueden volver a cerrar periodos reabiertos.',
            ]);
        }

        $periodStart = $payPeriod->period_start->toDateString();
        $periodEnd = $payPeriod->period_end->toDateString();

        $employees = $this->employeeRepository->getActiveForPayPeriod($payPeriod->branch_id);

        $holidays = Holiday::whereBetween('date', [$periodStart, $periodEnd])->get();
        $punctualityRanges = PunctualityRange::orderBy('sort_order')->get();

        DB::transaction(function () use ($payPeriod, $employees, $holidays, $punctualityRanges, $request) {
            PayPeriodEmployee::where('pay_period_id', $payPeriod->id)->delete();

            ($this->recalculate)($payPeriod, $employees, $holidays, $punctualityRanges);

            $payPeriod->auditReason = 'Periodo recalculado y cerrado nuevamente';
            $payPeriod->update([
                'status' => PayPeriod::STATUS_CLOSED,
                'closed_by' => $request->user()->id,
                'closed_at' => $this->clock->nowUtc(),
            ]);
        });

        $payPeriod->load(array_merge(
            ['closedBy', 'reopenedBy', 'payPeriodEmployees.employee.user', 'payPeriodEmployees.lines'],
            $this->payPeriodEmployeeAvatarRelations()
        ));

        return new PayPeriodResource($payPeriod);
    }
}
