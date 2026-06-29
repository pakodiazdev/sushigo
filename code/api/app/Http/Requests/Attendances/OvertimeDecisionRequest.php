<?php

namespace App\Http\Requests\Attendances;

/**
 * Validate the overtime authorization/rejection payload.
 *
 * @OA\Schema(
 *     schema="OvertimeDecisionRequest",
 *     required={"authorize"},
 *
 *     @OA\Property(
 *         property="authorize",
 *         type="boolean",
 *         example=true,
 *         description="true to authorize overtime payment, false to reject it."
 *     ),
 *     @OA\Property(
 *         property="reason",
 *         type="string",
 *         example="Autorización retroactiva aprobada por gerencia",
 *         description="Required when an Admin decides overtime for a past-day record."
 *     )
 * )
 */
class OvertimeDecisionRequest extends AttendanceFormRequest
{
    public function rules(): array
    {
        return [
            'authorize' => ['required', 'boolean'],
            'reason' => $this->reasonRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'authorize.required' => 'La decisión sobre horas extra es requerida.',
            'authorize.boolean' => 'La decisión debe ser verdadero o falso.',
            'reason.required' => 'Se requiere un motivo para editar registros de días anteriores.',
        ];
    }
}
