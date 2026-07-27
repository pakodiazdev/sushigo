<?php

namespace App\Http\Requests\PayPeriods;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Throwable;

abstract class BasePayPeriodRangeRequest extends FormRequest
{
    private const NOT_MONDAY_MESSAGE = 'El periodo debe iniciar en lunes.';

    private const NOT_FULL_WEEK_MESSAGE = 'El periodo debe terminar el domingo siguiente (semana completa).';

    public function authorize(): bool
    {
        return $this->user()->can($this->requiredPermission());
    }

    abstract protected function requiredPermission(): string;

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            // Plain calendar dates, not datetimes — the Monday/Sunday checks below assume no
            // time-of-day or UTC-offset component, so `date_format:Y-m-d` (not `date`) keeps
            // the contract unambiguous instead of silently accepting offsets.
            'period_start' => ['required', 'date_format:Y-m-d'],
            'period_end' => ['required', 'date_format:Y-m-d', 'after_or_equal:period_start'],
        ];
    }

    /**
     * Periods are always a full Monday–Sunday week — no partial ranges.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $start = $this->input('period_start');
            $end = $this->input('period_end');

            if (! $start || ! $end) {
                return;
            }

            try {
                $startDate = Carbon::parse($start)->startOfDay();
                $endDate = Carbon::parse($end)->startOfDay();
            } catch (Throwable) {
                return;
            }

            if (! $startDate->isMonday()) {
                $validator->errors()->add('period_start', self::NOT_MONDAY_MESSAGE);

                return;
            }

            if (! $endDate->equalTo($startDate->copy()->addDays(6))) {
                $validator->errors()->add('period_start', self::NOT_FULL_WEEK_MESSAGE);
            }
        });
    }

    public function branchId(): int
    {
        return (int) $this->validated('branch_id');
    }

    public function periodStart(): string
    {
        return $this->validated('period_start');
    }

    public function periodEnd(): string
    {
        return $this->validated('period_end');
    }
}
