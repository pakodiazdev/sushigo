<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate query parameters for the today attendance view.
 */
class TodayAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->whereNull('deleted_at')],
        ];
    }

    public function messages(): array
    {
        return [
            'branch_id.required' => 'El branch_id es requerido.',
            'branch_id.integer'  => 'El branch_id debe ser un número entero.',
            'branch_id.exists'   => 'La sucursal indicada no existe.',
        ];
    }
}
