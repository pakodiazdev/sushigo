<?php

namespace App\Http\Requests\PayPeriods;

use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Illuminate\Validation\Validator;
use Throwable;

class ConfirmClosePayPeriodRequest extends BasePayPeriodRangeRequest
{
    private const BEFORE_GATE_MESSAGE = 'El cierre solo puede confirmarse a partir del domingo 19:00 hrs.';

    private const GATE_HOUR = 19;

    public function __construct(private readonly ApplicationClock $clock)
    {
        parent::__construct();
    }

    protected function requiredPermission(): string
    {
        return 'payroll.close';
    }

    /**
     * The initial close may only be confirmed once the week is actually over
     * (Sunday >= 19:00 in the business timezone). This is the authoritative
     * gate — any client-side disabled state is a UX nicety only.
     */
    public function withValidator(Validator $validator): void
    {
        parent::withValidator($validator);

        $validator->after(function (Validator $validator) {
            $periodEnd = $this->input('period_end');
            if (! $periodEnd) {
                return;
            }

            try {
                $gateOpensAt = Carbon::parse($periodEnd, $this->clock->businessTimezone())
                    ->setTime(self::GATE_HOUR, 0);
            } catch (Throwable) {
                return;
            }

            if ($this->clock->nowInBusinessTz()->lt($gateOpensAt)) {
                $validator->errors()->add('period_start', self::BEFORE_GATE_MESSAGE);
            }
        });
    }
}
