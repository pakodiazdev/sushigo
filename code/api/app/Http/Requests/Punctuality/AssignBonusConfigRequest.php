<?php

namespace App\Http\Requests\Punctuality;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignBonusConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bonus_group_id' => [
                'required',
                'string',
                Rule::exists('punctuality_bonus_groups', 'public_id')->where('is_active', true),
            ],
            'effective_from' => ['required', 'date'],
        ];
    }
}
