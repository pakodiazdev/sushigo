<?php

namespace App\Http\Requests\Attendances;

use App\Enums\OvertimeValuationMethod;
use Illuminate\Validation\Rule;

/**
 * Validate the query params for a read-only overtime valuation preview.
 * Reuses AttendanceFormRequest's 'edit' gate — same authorization as the
 * decision endpoint itself, since the preview is only useful right before deciding.
 *
 * @OA\Schema(
 *     schema="PreviewOvertimeValuationRequest",
 *     required={"valuation_method"},
 *
 *     @OA\Property(property="valuation_method", type="string", enum={"LFT_PROPORTIONAL", "AGREED_RATE", "SALARY_FACTOR"}, example="SALARY_FACTOR"),
 *     @OA\Property(property="agreed_rate", type="number", format="float", nullable=true, example=90.00),
 *     @OA\Property(property="agreed_factor", type="number", format="float", nullable=true, example=1.5)
 * )
 */
class PreviewOvertimeValuationRequest extends AttendanceFormRequest
{
    public function rules(): array
    {
        return [
            'valuation_method' => ['required', Rule::enum(OvertimeValuationMethod::class)],
            'agreed_rate' => ['nullable', 'required_if:valuation_method,AGREED_RATE', 'numeric', 'gt:0'],
            'agreed_factor' => ['nullable', 'required_if:valuation_method,SALARY_FACTOR', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'agreed_rate.required_if' => 'La tarifa pactada es requerida para calcular el preview.',
            'agreed_factor.required_if' => 'El factor es requerido para calcular el preview.',
        ];
    }
}
