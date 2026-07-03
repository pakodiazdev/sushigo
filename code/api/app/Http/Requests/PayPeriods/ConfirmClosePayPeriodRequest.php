<?php

namespace App\Http\Requests\PayPeriods;

class ConfirmClosePayPeriodRequest extends BasePayPeriodRangeRequest
{
    protected function requiredPermission(): string
    {
        return 'payroll.close';
    }
}
