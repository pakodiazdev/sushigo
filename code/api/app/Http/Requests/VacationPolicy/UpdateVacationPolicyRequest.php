<?php

namespace App\Http\Requests\VacationPolicy;

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
    public function authorize(): bool
    {
        return $this->user()->can('vacation-policy.manage');
    }

    public function rules(): array
    {
        return [
            'active_rule_key' => ['required', 'string', Rule::in(['VacationsLFTMX', 'CustomCompanyPolicy'])],
            'tiers' => ['required_if:active_rule_key,CustomCompanyPolicy', 'nullable', 'array', 'min:1'],
            'tiers.*.years_from' => ['required', 'integer', 'min:1'],
            'tiers.*.days' => ['required', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($this->input('active_rule_key') !== 'CustomCompanyPolicy') {
                return;
            }

            $yearsFrom = collect($this->input('tiers', []))->pluck('years_from');

            if ($yearsFrom->duplicates()->isNotEmpty()) {
                $v->errors()->add('tiers', 'Los valores de years_from deben ser únicos.');
            }
        });
    }
}
