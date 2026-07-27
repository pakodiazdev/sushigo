<?php

namespace App\Http\Requests\PayPeriods;

use Illuminate\Foundation\Http\FormRequest;

class NextUnclosedPayPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('payroll.preview');
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
        ];
    }

    public function branchId(): int
    {
        return (int) $this->validated('branch_id');
    }
}
