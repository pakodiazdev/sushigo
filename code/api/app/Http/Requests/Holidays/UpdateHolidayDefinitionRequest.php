<?php

declare(strict_types=1);

namespace App\Http\Requests\Holidays;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateHolidayDefinitionRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255),
 *   @OA\Property(property="description", type="string", nullable=true, maxLength=500),
 *   @OA\Property(property="type", type="string", enum={"obligatorio","asueto","opcional"}),
 *   @OA\Property(property="pay_multiplier", type="number", format="float"),
 *   @OA\Property(property="is_annual", type="boolean"),
 *   @OA\Property(property="recurrence_type", type="string", enum={"fixed","nth_weekday","floating","none"}),
 *   @OA\Property(property="recurrence_config", type="object")
 * )
 */
class UpdateHolidayDefinitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'type' => ['sometimes', 'in:obligatorio,asueto,opcional'],
            'pay_multiplier' => ['sometimes', 'nullable', 'numeric', 'min:1', 'max:9.99'],
            'is_annual' => ['sometimes', 'boolean'],
            'recurrence_type' => ['sometimes', 'in:fixed,nth_weekday,floating,none'],
            'recurrence_config' => ['sometimes', 'array'],
            'recurrence_config.month' => ['integer', 'min:1', 'max:12'],
            'recurrence_config.day' => ['integer', 'min:1', 'max:31'],
            'recurrence_config.week' => ['integer', 'min:1', 'max:5'],
            'recurrence_config.weekday' => ['integer', 'min:1', 'max:7'],
        ];
    }
}
