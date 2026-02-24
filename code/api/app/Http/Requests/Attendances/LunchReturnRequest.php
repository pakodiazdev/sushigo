<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validate the lunch-return registration payload.
 *
 * @OA\Schema(
 *     schema="LunchReturnRequest",
 *     required={"lunch_end"},
 *     @OA\Property(
 *         property="lunch_end",
 *         type="string",
 *         format="date-time",
 *         example="2026-02-23T14:10:00",
 *         description="ISO 8601 datetime (no timezone) at which the employee returned from lunch."
 *     )
 * )
 */
class LunchReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lunch_end' => ['required', 'date_format:Y-m-d\TH:i:s'],
        ];
    }

    public function messages(): array
    {
        return [
            'lunch_end.required'    => 'La hora de regreso de comida es requerida.',
            'lunch_end.date_format' => 'La hora de regreso debe tener el formato ISO 8601: YYYY-MM-DDTHH:MM:SS.',
        ];
    }
}
