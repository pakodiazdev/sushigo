<?php

namespace App\Http\Requests\Reports;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;

class WeeklySummaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('reports.weekly-summary');
    }

    public function rules(): array
    {
        return [
            'employee_id' => ['required', 'string', 'exists:employees,public_id'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.required' => 'El employee_id es requerido.',
            'employee_id.exists' => 'El empleado indicado no existe.',
            'period_start.required' => 'La fecha de inicio del período es requerida.',
            'period_end.required' => 'La fecha de fin del período es requerida.',
            'period_end.after_or_equal' => 'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
        ];
    }

    public function employee(): Employee
    {
        return Employee::where('public_id', $this->validated('employee_id'))->firstOrFail();
    }
}
