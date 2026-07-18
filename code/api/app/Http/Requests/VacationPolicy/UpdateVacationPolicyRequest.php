<?php

namespace App\Http\Requests\VacationPolicy;

use App\Http\Requests\Concerns\ValidatesVacationPolicyTiers;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *     schema="UpdateVacationPolicyRequest",
 *     title="Update Vacation Policy Request",
 *     required={"active_rule_key"},
 *
 *     @OA\Property(property="active_rule_key", type="string", enum={"VacationsLFTMX", "CustomCompanyPolicy"}, example="CustomCompanyPolicy"),
 *     @OA\Property(
 *         property="tiers",
 *         type="array",
 *         description="Required when active_rule_key is CustomCompanyPolicy. Ignored otherwise.",
 *
 *         @OA\Items(
 *
 *             @OA\Property(property="years_from", type="integer", minimum=1, example=1),
 *             @OA\Property(property="days", type="integer", minimum=0, example=18)
 *         )
 *     )
 * )
 */
class UpdateVacationPolicyRequest extends FormRequest
{
    use ValidatesVacationPolicyTiers;

    public function authorize(): bool
    {
        return $this->user()->can('vacation-policy.manage');
    }

    public function rules(): array
    {
        return array_merge(
            ['active_rule_key' => ['required', 'string', Rule::in(['VacationsLFTMX', 'CustomCompanyPolicy'])]],
            $this->vacationPolicyTierRules('active_rule_key', 'CustomCompanyPolicy'),
        );
    }

    public function withValidator(Validator $validator): void
    {
        $this->validateUniqueTierYears($validator, 'active_rule_key', 'CustomCompanyPolicy');
    }
}
