<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="CheckInRequest",
 *   required={"employee_id", "check_in"},
 *
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
 *       example="2026-02-23T09:05:30-06:00",
 *       description="Check-in datetime in ISO 8601 / RFC 3339 with timezone offset. Normalized to UTC by the server."
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
            'check_in' => ['required', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.exists' => 'No se encontró el empleado especificado.',
            'check_in.date' => 'El campo check_in debe ser una fecha válida en formato ISO 8601 (ej. 2026-02-23T09:05:30-06:00).',
        ];
    }
}
