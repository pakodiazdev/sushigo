<?php

namespace App\Http\Requests\Holidays;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="StoreHolidayRequest",
 *   required={"date", "name"},
 *
 *   @OA\Property(property="date", type="string", format="date", example="2026-01-01", description="Holiday date (unique)"),
 *   @OA\Property(property="name", type="string", example="New Year's Day", description="Holiday name"),
 *   @OA\Property(property="pay_multiplier", type="number", format="float", example=2.00, description="Pay multiplier (default 2.0)")
 * )
 */
class StoreHolidayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date', 'unique:holidays,date'],
            'name' => ['required', 'string', 'max:255'],
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
