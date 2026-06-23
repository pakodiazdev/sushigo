<?php

declare(strict_types=1);

namespace App\Http\Requests\Holidays;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateHolidayRequest",
 *
 *   @OA\Property(property="date", type="string", format="date", example="2026-01-01"),
 *   @OA\Property(property="name", type="string", example="New Year's Day"),
 *   @OA\Property(property="type", type="string", enum={"obligatorio","asueto","opcional"}, description="Override instance type"),
 *   @OA\Property(property="pay_multiplier", type="number", format="float", example=2.00)
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
            'type' => ['sometimes', 'nullable', 'in:obligatorio,asueto,opcional'],
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

    /**
     * Returns validated data with is_auto_generated derived from whether type was explicitly set.
     *
     * @return array<string, mixed>
     */
    public function holidayData(): array
    {
        $data = $this->validated();

        if (isset($data['type'])) {
            $data['is_auto_generated'] = false;
        }

        return $data;
    }
}
