<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validate the lunch-start registration payload.
 *
 * @OA\Schema(
 *     schema="LunchStartRequest",
 *     required={"lunch_start"},
 *     @OA\Property(
 *         property="lunch_start",
 *         type="string",
 *         format="date-time",
 *         example="2026-02-23T13:05:00-06:00",
 *         description="Lunch-start datetime in ISO 8601 / RFC 3339 with timezone offset. Normalized to UTC by the server."
 *     )
 * )
 */
class LunchStartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lunch_start' => ['required', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'lunch_start.required'    => 'La hora de salida a comida es requerida.',
            'lunch_start.date' => 'La hora de salida debe ser una fecha válida en formato ISO 8601 (ej. 2026-02-23T13:05:00-06:00).',
        ];
    }
}
