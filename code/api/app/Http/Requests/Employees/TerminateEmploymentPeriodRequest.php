<?php

namespace App\Http\Requests\Employees;

use Illuminate\Foundation\Http\FormRequest;

class TerminateEmploymentPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'end_date' => [
                'required',
                'date',
                'after_or_equal:' . $this->route('employmentPeriod')?->start_date?->toDateString(),
            ],
            'termination_reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'end_date.after_or_equal' => 'The end date must be on or after the period start date.',
        ];
    }
}
