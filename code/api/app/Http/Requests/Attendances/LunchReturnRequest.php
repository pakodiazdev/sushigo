<?php

namespace App\Http\Requests\Attendances;

/**
 * Validate the lunch-return registration payload.
 *
 * @OA\Schema(
 *     schema="LunchReturnRequest",
 *     required={"lunch_end"},
 *
 *     @OA\Property(
 *         property="lunch_end",
 *         type="string",
 *         format="date-time",
 *         example="2026-02-23T14:10:00-06:00",
 *         description="Lunch-return datetime in ISO 8601 / RFC 3339 with timezone offset. Normalized to UTC by the server."
 *     ),
 *     @OA\Property(
 *         property="reason",
 *         type="string",
 *         example="Corrección retroactiva",
 *         description="Required when an Admin edits a past-day record."
 *     )
 * )
 */
class LunchReturnRequest extends AttendanceFormRequest
{
    public function rules(): array
    {
        return [
            'lunch_end' => ['required', 'date'],
            'reason' => $this->reasonRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'lunch_end.required' => 'La hora de regreso de comida es requerida.',
            'lunch_end.date' => 'La hora de regreso debe ser una fecha válida en formato ISO 8601 (ej. 2026-02-23T14:10:00-06:00).',
            'reason.required' => 'Se requiere un motivo para editar registros de días anteriores.',
        ];
    }
}
