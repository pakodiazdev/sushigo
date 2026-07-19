<?php

namespace App\Http\Requests\Employees;

use App\Enums\OvertimeMovementType;
use App\Http\Requests\Concerns\GuardsClosedPayPeriod;
use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreManualOvertimeMovementRequest extends FormRequest
{
    use GuardsClosedPayPeriod;

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('employees.update');
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'movement_type' => ['required', Rule::in([
                OvertimeMovementType::USED->value,
                OvertimeMovementType::ADJUSTMENT->value,
            ])],
            'minutes' => [
                'required',
                'integer',
                $this->input('movement_type') === OvertimeMovementType::USED->value ? 'min:1' : 'not_in:0',
            ],
            'reason' => ['required', 'string', 'max:500'],
        ];
    }

    public function manualMovementData(): array
    {
        $data = $this->validated();
        $data['movement_type'] = OvertimeMovementType::from($data['movement_type']);

        return $data;
    }

    public function withValidator(Validator $validator): void
    {
        $employee = $this->route('employee');
        if (! $employee instanceof Employee) {
            return;
        }

        $this->guardClosedPeriod($validator, $employee->id, $this->input('date'));
    }
}
