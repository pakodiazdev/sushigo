<?php

namespace App\Http\Requests\Attendances;

use App\Http\Requests\Concerns\ValidatesOvertimeDecisionFields;

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
    use ValidatesOvertimeDecisionFields;

    public function rules(): array
    {
        return [
            ...$this->overtimeDecisionRules(),
            'reason' => $this->reasonRules(),
        ];
    }

    public function messages(): array
    {
        return [
            ...$this->overtimeDecisionMessages(),
            'reason.required' => 'Se requiere un motivo para editar registros de días anteriores.',
        ];
    }
}
