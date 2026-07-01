<?php

namespace App\Http\Requests\Employees;

use App\Enums\TerminationType;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class DeactivateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'end_date' => ['required', 'date'],
            'termination_reason' => ['nullable', 'string', 'max:500'],
            'termination_type' => ['nullable', new Enum(TerminationType::class)],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $employee = $this->route('employee');

            $activePeriod = $employee->employmentPeriods()->active()->first();

            if (! $activePeriod) {
                $validator->errors()->add('employee', 'Employee has no active employment period.');

                return;
            }

            if ($this->end_date && $activePeriod->start_date && Carbon::parse($this->end_date)->lt($activePeriod->start_date)) {
                $validator->errors()->add('end_date', 'The end date must be after or equal to the active period start date.');
            }
        });
    }
}
