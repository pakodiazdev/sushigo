<?php

namespace App\Http\Requests\Employees;

use App\Enums\OvertimeMovementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManualOvertimeMovementRequest extends FormRequest
{
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
}
