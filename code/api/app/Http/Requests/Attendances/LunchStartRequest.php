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
 *         example="2026-02-23T13:05:00",
 *         description="ISO 8601 datetime (no timezone) at which the employee left for lunch."
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
            'lunch_start' => ['required', 'date_format:Y-m-d\TH:i:s'],
        ];
    }

    public function messages(): array
    {
        return [
            'lunch_start.required'    => 'La hora de salida a comida es requerida.',
            'lunch_start.date_format' => 'La hora de salida debe tener el formato ISO 8601: YYYY-MM-DDTHH:MM:SS.',
        ];
    }
}
