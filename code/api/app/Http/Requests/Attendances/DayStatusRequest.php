<?php

namespace App\Http\Requests\Attendances;

use App\Enums\DayStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="DayStatusRequest",
 *   required={"employee_id", "date", "day_status"},
 *
 *   @OA\Property(
 *       property="employee_id",
 *       type="string",
 *       example="01JKXYZ1234567890ABCDEFGH",
 *       description="Employee public_id (ULID)"
 *   ),
 *   @OA\Property(
 *       property="date",
 *       type="string",
 *       format="date",
 *       example="2026-04-12",
 *       description="Date to mark (YYYY-MM-DD)"
 *   ),
 *   @OA\Property(
 *       property="day_status",
 *       type="string",
 *       enum={"DAY_OFF","ABSENCE"},
 *       example="DAY_OFF",
 *       description="Status to assign: DAY_OFF (rest day) or ABSENCE (no-show)"
 *   )
 * )
 */
class DayStatusRequest extends FormRequest
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
            'date' => ['required', 'date_format:Y-m-d'],
            'day_status' => [
                'required',
                Rule::in([DayStatus::DAY_OFF->value, DayStatus::ABSENCE->value]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.exists' => 'No se encontró el empleado especificado.',
            'date.date_format' => 'La fecha debe estar en formato YYYY-MM-DD.',
            'day_status.in' => 'El estado debe ser DAY_OFF o ABSENCE.',
        ];
    }
}
