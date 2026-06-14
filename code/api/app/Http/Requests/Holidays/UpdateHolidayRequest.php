<?php

namespace App\Http\Requests\Holidays;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateHolidayRequest",
 *
 *   @OA\Property(property="date", type="string", format="date", example="2026-01-01", description="New holiday date"),
 *   @OA\Property(property="name", type="string", example="New Year's Day", description="Holiday name"),
 *   @OA\Property(property="pay_multiplier", type="number", format="float", example=2.00, description="Pay multiplier")
 * )
 */
class UpdateHolidayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'date' => ['sometimes', 'date', Rule::unique('holidays', 'date')->ignore($id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'pay_multiplier' => ['sometimes', 'numeric', 'min:1', 'max:9.99'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.unique' => 'A holiday already exists for this date.',
            'pay_multiplier.min' => 'The pay multiplier must be at least 1.',
        ];
    }
}
