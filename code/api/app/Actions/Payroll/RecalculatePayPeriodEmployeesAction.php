<?php

namespace App\Actions\Payroll;

use App\Models\PayPeriod;
use Illuminate\Support\Collection;

/**
 * Recalculate and persist the payroll breakdown for every employee in a PayPeriod.
 *
 * Shared by the initial close (ConfirmCloseController) and the reclose flow
 * (ReclosePayPeriodController) — both need the exact same per-employee
 * computation (ClosePayPeriodForEmployeeAction), the only difference is
 * whether pre-existing PayPeriodEmployee rows are wiped first, which is the
 * caller's responsibility.
 */
class RecalculatePayPeriodEmployeesAction
{
    public function __construct(
        private ClosePayPeriodForEmployeeAction $closePayPeriodForEmployee,
    ) {}

    public function __invoke(
        PayPeriod $payPeriod,
        Collection $employees,
        Collection $holidays,
        Collection $punctualityRanges,
    ): void {
        $periodStart = $payPeriod->period_start->toDateString();
        $periodEnd = $payPeriod->period_end->toDateString();

        foreach ($employees as $employee) {
            ($this->closePayPeriodForEmployee)(
                $employee,
                $payPeriod,
                $periodStart,
                $periodEnd,
                $holidays,
                $punctualityRanges
            );
        }
    }
}
