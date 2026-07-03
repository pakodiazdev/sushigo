<?php

namespace App\Http\Requests\Overtime;

use App\Enums\OvertimeValuationMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SetOvertimeConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'valuation_method' => ['required', Rule::enum(OvertimeValuationMethod::class)],
            'lft_factor' => ['required_if:valuation_method,LFT_PROPORTIONAL', 'nullable', 'numeric', 'gt:0'],
            'hourly_rate' => ['required_if:valuation_method,AGREED_RATE', 'nullable', 'numeric', 'gt:0'],
            'effective_from' => ['required', 'date'],
        ];
    }
}
