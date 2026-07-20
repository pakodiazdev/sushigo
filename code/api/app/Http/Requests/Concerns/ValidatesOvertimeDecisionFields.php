<?php

namespace App\Http\Requests\Concerns;

use App\Enums\OvertimeValuationMethod;
use Illuminate\Validation\Rule;

/**
 * Shared "authorize / valuation_method / agreed_rate / agreed_factor" validation,
 * used by both OvertimeDecisionRequest (single) and BulkOvertimeDecisionRequest.
 */
trait ValidatesOvertimeDecisionFields
{
    /**
     * @return array<string, mixed>
     */
    protected function overtimeDecisionRules(): array
    {
        return [
            'authorize' => ['required', 'boolean'],
            'valuation_method' => ['nullable', 'required_if:authorize,true', Rule::enum(OvertimeValuationMethod::class)],
            'agreed_rate' => ['nullable', 'required_if:valuation_method,AGREED_RATE', 'numeric', 'gt:0'],
            'agreed_factor' => ['nullable', 'required_if:valuation_method,SALARY_FACTOR', 'numeric', 'gt:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function overtimeDecisionMessages(): array
    {
        return [
            'authorize.required' => 'La decisión sobre horas extra es requerida.',
            'authorize.boolean' => 'La decisión debe ser verdadero o falso.',
            'valuation_method.required_if' => 'El método de valoración es requerido al autorizar el pago.',
            'agreed_rate.required_if' => 'La tarifa pactada es requerida cuando el método es Tarifa Pactada.',
            'agreed_factor.required_if' => 'El factor es requerido cuando el método es Factor sobre Salario.',
        ];
    }
}
