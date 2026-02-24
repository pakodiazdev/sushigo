<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validate the check-out registration payload.
 *
 * @OA\Schema(
 *     schema="CheckOutRequest",
 *     required={"check_out"},
 *     @OA\Property(
 *         property="check_out",
 *         type="string",
 *         format="date-time",
 *         example="2026-02-23T17:05:00",
 *         description="ISO 8601 datetime (no timezone) at which the employee clocked out."
 *     )
 * )
 */
class CheckOutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'check_out' => ['required', 'date_format:Y-m-d\TH:i:s'],
        ];
    }

    public function messages(): array
    {
        return [
            'check_out.required'    => 'La hora de salida es requerida.',
            'check_out.date_format' => 'La hora de salida debe tener el formato ISO 8601: YYYY-MM-DDTHH:MM:SS.',
        ];
    }
}
