<?php

namespace App\Http\Requests\PayPeriods;

use App\Models\PayPeriod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListPayPeriodsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('payroll.preview');
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'status' => ['nullable', 'string', Rule::in([
                PayPeriod::STATUS_OPEN,
                PayPeriod::STATUS_CLOSED,
                PayPeriod::STATUS_REOPENED,
            ])],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function perPage(): int
    {
        return (int) ($this->validated('per_page') ?? 15);
    }
}
