<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;

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
 *     )
 * )
 */
class OvertimeDecisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'authorize' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'authorize.required' => 'La decisión sobre horas extra es requerida.',
            'authorize.boolean' => 'La decisión debe ser verdadero o falso.',
        ];
    }
}
