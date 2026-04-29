<?php

namespace App\Http\Requests\Punctuality;

use Illuminate\Foundation\Http\FormRequest;

class AssignBonusConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bonus_group_id' => ['required', 'string', 'exists:punctuality_bonus_groups,public_id'],
            'effective_from' => ['required', 'date'],
        ];
    }
}
