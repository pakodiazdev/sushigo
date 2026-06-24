<?php

namespace App\Http\Requests\PayPeriods;

use Illuminate\Foundation\Http\FormRequest;

class PreviewPayPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('payroll.preview');
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
        ];
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
