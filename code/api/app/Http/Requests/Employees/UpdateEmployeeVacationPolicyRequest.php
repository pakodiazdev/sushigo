<?php

namespace App\Http\Requests\Employees;

use App\Http\Requests\Concerns\ValidatesVacationPolicyTiers;
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
    use ValidatesVacationPolicyTiers;

    public function authorize(): bool
    {
        return $this->user()->can('employees.update');
    }

    public function rules(): array
    {
        return array_merge(
            ['rule_key' => ['nullable', 'string', Rule::in(['ContractualPolicy'])]],
            $this->vacationPolicyTierRules('rule_key', 'ContractualPolicy'),
        );
    }

    public function withValidator(Validator $validator): void
    {
        $this->validateUniqueTierYears($validator, 'rule_key', 'ContractualPolicy');
    }
}
