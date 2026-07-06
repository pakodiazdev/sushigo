<?php

namespace App\Http\Requests\Attendances;

use App\Enums\OvertimeValuationMethod;
use Illuminate\Validation\Rule;

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
 *         property="valuation_method",
 *         type="string",
 *         enum={"LFT_PROPORTIONAL", "AGREED_RATE", "SALARY_FACTOR"},
 *         nullable=true,
 *         example="AGREED_RATE",
 *         description="Required when authorize=true. LFT_PROPORTIONAL resolves its factor automatically from the configured tiers."
 *     ),
 *     @OA\Property(
 *         property="agreed_rate",
 *         type="number",
 *         format="float",
 *         nullable=true,
 *         example=90.00,
 *         description="Required when valuation_method=AGREED_RATE (flat hourly rate). Ignored otherwise."
 *     ),
 *     @OA\Property(
 *         property="agreed_factor",
 *         type="number",
 *         format="float",
 *         nullable=true,
 *         example=1.5,
 *         description="Required when valuation_method=SALARY_FACTOR (multiplier of the employee's own minute rate). Ignored otherwise."
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
            'valuation_method' => ['nullable', 'required_if:authorize,true', Rule::enum(OvertimeValuationMethod::class)],
            'agreed_rate' => ['nullable', 'required_if:valuation_method,AGREED_RATE', 'numeric', 'gt:0'],
            'agreed_factor' => ['nullable', 'required_if:valuation_method,SALARY_FACTOR', 'numeric', 'gt:0'],
            'reason' => $this->reasonRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'authorize.required' => 'La decisión sobre horas extra es requerida.',
            'authorize.boolean' => 'La decisión debe ser verdadero o falso.',
            'valuation_method.required_if' => 'El método de valoración es requerido al autorizar el pago.',
            'agreed_rate.required_if' => 'La tarifa pactada es requerida cuando el método es Tarifa Pactada.',
            'agreed_factor.required_if' => 'El factor es requerido cuando el método es Factor sobre Salario.',
            'reason.required' => 'Se requiere un motivo para editar registros de días anteriores.',
        ];
    }
}
