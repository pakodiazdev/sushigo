<?php

namespace App\Http\Requests\Employees;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RehireEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->whereNull('deleted_at')],
            'start_date' => ['required', 'date'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $employee = $this->route('employee');

            $hasActiveEmploymentPeriod = $employee->employmentPeriods()->active()->exists();

            if ($employee->is_active && $hasActiveEmploymentPeriod) {
                $validator->errors()->add('employee', 'Employee is already active.');
                return;
            }

            if ($hasActiveEmploymentPeriod) {
                $validator->errors()->add('employee', 'Employee already has an active employment period.');
            }
        });
    }
}
