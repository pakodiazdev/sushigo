<?php

namespace App\Http\Requests\Employees;

use App\Models\Employee;
use App\Models\VacationEntitlement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RegisterVacationEntitlementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('vacation.manage');
    }

    public function rules(): array
    {
        return [
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            /** @var Employee $employee */
            $employee = $this->route('employee');
            $year = (int) $this->input('year');

            if (VacationEntitlement::where('employee_id', $employee->id)->where('year', $year)->exists()) {
                $v->errors()->add('year', "Ya existe un derecho vacacional registrado para el año {$year}.");
            }
        });
    }

    public function year(): int
    {
        return (int) $this->validated()['year'];
    }
}
