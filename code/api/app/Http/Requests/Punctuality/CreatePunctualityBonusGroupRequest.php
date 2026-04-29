<?php

namespace App\Http\Requests\Punctuality;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *     schema="CreatePunctualityBonusGroupRequest",
 *     required={"name","weekly_bonus_amount","working_days_divisor"},
 *
 *     @OA\Property(property="name", type="string", maxLength=50, example="Grupo $110 (÷6)"),
 *     @OA\Property(property="weekly_bonus_amount", type="number", format="float", minimum=0.01, example=110.00),
 *     @OA\Property(property="working_days_divisor", type="integer", minimum=1, example=6)
 * )
 */
class CreatePunctualityBonusGroupRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50'],
            'weekly_bonus_amount' => ['required', 'numeric', 'min:0.01'],
            'working_days_divisor' => ['required', 'integer', 'min:1'],
        ];
    }
}
