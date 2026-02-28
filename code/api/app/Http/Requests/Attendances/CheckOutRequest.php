<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validate the check-out registration payload.
 *
 * @OA\Schema(
 *     schema="CheckOutRequest",
 *     required={"check_out"},
 *
 *     @OA\Property(
 *         property="check_out",
 *         type="string",
 *         format="date-time",
 *         example="2026-02-23T17:05:00-06:00",
 *         description="Check-out datetime in ISO 8601 / RFC 3339 with timezone offset. Normalized to UTC by the server."
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
            'check_out' => ['required', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'check_out.required' => 'La hora de salida es requerida.',
            'check_out.date' => 'La hora de salida debe ser una fecha válida en formato ISO 8601 (ej. 2026-02-23T17:05:00-06:00).',
        ];
    }
}
