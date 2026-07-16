<?php

namespace App\Actions\Payroll;

use App\Models\Employee;
use App\Models\PayPeriod;
use App\Models\PayPeriodEmployee;
use App\Models\PayPeriodLine;
use App\Services\PayPeriodPreviewService;
use Illuminate\Support\Collection;

/**
 * Computes and persists one employee's payroll breakdown for a given period,
 * freezing it as PayPeriodEmployee + PayPeriodLine rows against an already
 * CLOSED PayPeriod.
 *
 * Shared by ConfirmCloseController (closing the current week) and
 * PayPeriodHistorySeeder (backfilling past weeks) so both go through the
 * exact same computation.
 */
class ClosePayPeriodForEmployeeAction
{
    public function __construct(
        private PayPeriodPreviewService $previewService,
        private CreateOvertimePaidMovementsAction $createOvertimePaidMovements,
    ) {}

    public function __invoke(
        Employee $employee,
        PayPeriod $payPeriod,
        string $periodStart,
        string $periodEnd,
        Collection $holidays,
        Collection $punctualityRanges,
    ): PayPeriodEmployee {
        ($this->createOvertimePaidMovements)($employee, $periodStart, $periodEnd);

        $preview = $this->previewService->buildEmployeePreview(
            $employee,
            $periodStart,
            $periodEnd,
            $holidays,
            $punctualityRanges
        );

        $payPeriodEmployee = PayPeriodEmployee::create([
            'pay_period_id' => $payPeriod->id,
            'employee_id' => $employee->id,
            'base_pay' => $preview['base_pay'],
            'late_deductions' => $preview['late_deductions'],
            'unpaid_leave_deductions' => $preview['unpaid_leave_deductions'],
            'overtime_pay' => $preview['overtime_pay'],
            'extra_day_pay' => $preview['extra_day_pay'],
            'punctuality_bonus' => $preview['punctuality_bonus'],
            'holiday_pay' => $preview['holiday_pay'],
            'other_adjustments' => $preview['other_adjustments'],
            'total_pay' => $preview['total_pay'],
            'free_hours_earned' => $preview['free_hours_earned'],
        ]);

        foreach ($preview['pay_period_lines'] as $line) {
            PayPeriodLine::create([
                'pay_period_employee_id' => $payPeriodEmployee->id,
                'date' => $line['date'],
                'concept' => $line['concept'],
                'description' => $line['description'],
                'amount' => $line['amount'],
                'minutes' => $line['minutes'],
            ]);
        }

        return $payPeriodEmployee;
    }
}
