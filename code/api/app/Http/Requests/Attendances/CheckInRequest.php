<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="CheckInRequest",
 *   required={"employee_id", "check_in"},
 *   @OA\Property(
 *       property="employee_id",
 *       type="string",
 *       example="01JKXYZ1234567890ABCDEFGH",
 *       description="Employee public_id (ULID)"
 *   ),
 *   @OA\Property(
 *       property="check_in",
 *       type="string",
 *       format="date-time",
 *       example="2026-02-23T09:05:30",
 *       description="Check-in timestamp in ISO 8601 format without timezone (Y-m-d\\TH:i:s)"
 *   )
 * )
 */
class CheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => [
                'required',
                'string',
                Rule::exists('employees', 'public_id')->whereNull('deleted_at'),
            ],
            'check_in' => ['required', 'date_format:Y-m-d\TH:i:s'],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.exists' => 'No se encontró el empleado especificado.',
            'check_in.date_format' => 'El campo check_in debe tener el formato Y-m-dTH:i:s (ej. 2026-02-23T09:05:30).',
        ];
    }
}
