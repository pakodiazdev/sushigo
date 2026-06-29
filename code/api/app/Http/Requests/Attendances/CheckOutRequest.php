<?php

namespace App\Http\Requests\Attendances;

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
 *     ),
 *     @OA\Property(
 *         property="reason",
 *         type="string",
 *         example="Corrección retroactiva autorizada por RH",
 *         description="Required when an Admin edits a past-day record. Stored in the audit log."
 *     )
 * )
 */
class CheckOutRequest extends AttendanceFormRequest
{
    public function rules(): array
    {
        return [
            'check_out' => ['required', 'date'],
            'reason' => $this->reasonRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'check_out.required' => 'La hora de salida es requerida.',
            'check_out.date' => 'La hora de salida debe ser una fecha válida en formato ISO 8601 (ej. 2026-02-23T17:05:00-06:00).',
            'reason.required' => 'Se requiere un motivo para editar registros de días anteriores.',
        ];
    }
}
