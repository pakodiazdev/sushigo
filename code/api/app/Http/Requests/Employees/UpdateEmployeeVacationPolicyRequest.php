<?php

namespace App\Http\Requests\Employees;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *     schema="UpdateEmployeeVacationPolicyRequest",
 *     title="Update Employee Vacation Policy Override Request",
 *
 *     @OA\Property(property="rule_key", type="string", nullable=true, enum={"ContractualPolicy"}, example="ContractualPolicy", description="null clears the override and falls back to the tenant default"),
 *     @OA\Property(
 *         property="tiers",
 *         type="array",
 *         description="Required when rule_key is ContractualPolicy. Ignored otherwise.",
 *
 *         @OA\Items(
 *
 *             @OA\Property(property="years_from", type="integer", minimum=1, example=1),
 *             @OA\Property(property="days", type="integer", minimum=0, example=30)
 *         )
 *     )
 * )
 */
class UpdateEmployeeVacationPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('employees.update');
    }

    public function rules(): array
    {
        return [
            'rule_key' => ['nullable', 'string', Rule::in(['ContractualPolicy'])],
            'tiers' => ['required_if:rule_key,ContractualPolicy', 'nullable', 'array', 'min:1'],
            'tiers.*.years_from' => ['required', 'integer', 'min:1'],
            'tiers.*.days' => ['required', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($this->input('rule_key') !== 'ContractualPolicy') {
                return;
            }

            $yearsFrom = collect($this->input('tiers', []))->pluck('years_from');

            if ($yearsFrom->duplicates()->isNotEmpty()) {
                $v->errors()->add('tiers', 'Los valores de years_from deben ser únicos.');
            }
        });
    }
}
