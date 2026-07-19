<?php

namespace App\Actions\Payroll;

use App\Models\PayPeriod;

/**
 * Answers whether a branch + date is still editable, i.e. not frozen inside
 * a CLOSED PayPeriod. REOPENED periods and dates with no covering period at
 * all are editable; only CLOSED blocks the write.
 */
class EnsurePeriodIsEditableAction
{
    public function __invoke(?int $branchId, ?string $date): bool
    {
        if (! $branchId || ! $date) {
            return true;
        }

        $period = PayPeriod::coveringDate($branchId, $date);

        return ! ($period && $period->isClosed());
    }
}
