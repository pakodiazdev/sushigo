<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Validator;

/**
 * Shared "years_from → days" tiers validation, used by both
 * UpdateVacationPolicyRequest (tenant default) and
 * UpdateEmployeeVacationPolicyRequest (per-employee override).
 */
trait ValidatesVacationPolicyTiers
{
    protected function vacationPolicyTierRules(string $gateField, string $gateValue): array
    {
        return [
            'tiers' => ["required_if:{$gateField},{$gateValue}", 'nullable', 'array', 'min:1'],
            'tiers.*.years_from' => ['required', 'integer', 'min:1'],
            'tiers.*.days' => ['required', 'integer', 'min:0'],
        ];
    }

    protected function validateUniqueTierYears(Validator $validator, string $gateField, string $gateValue): void
    {
        $validator->after(function (Validator $v) use ($gateField, $gateValue) {
            if ($this->input($gateField) !== $gateValue) {
                return;
            }

            $yearsFrom = collect($this->input('tiers', []))->pluck('years_from');

            if ($yearsFrom->duplicates()->isNotEmpty()) {
                $v->errors()->add('tiers', 'Los valores de years_from deben ser únicos.');
            }
        });
    }
}
