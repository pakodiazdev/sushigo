<?php

declare(strict_types=1);

namespace App\Http\Requests\Holidays;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreHolidayDefinitionRequest",
 *   required={"name", "type", "recurrence_type"},
 *
 *   @OA\Property(property="name", type="string", maxLength=255, example="Independence Day"),
 *   @OA\Property(property="description", type="string", nullable=true, maxLength=500),
 *   @OA\Property(property="type", type="string", enum={"obligatorio","asueto","opcional"}),
 *   @OA\Property(property="pay_multiplier", type="number", format="float", example=2.00, description="Required only when type=opcional"),
 *   @OA\Property(property="is_annual", type="boolean", default=false),
 *   @OA\Property(property="recurrence_type", type="string", enum={"fixed","nth_weekday","floating","none"}),
 *   @OA\Property(property="recurrence_config", type="object",
 *     @OA\Property(property="month", type="integer", minimum=1, maximum=12),
 *     @OA\Property(property="day", type="integer", minimum=1, maximum=31),
 *     @OA\Property(property="week", type="integer", minimum=1, maximum=5),
 *     @OA\Property(property="weekday", type="integer", minimum=1, maximum=7)
 *   ),
 *   @OA\Property(property="date", type="string", format="date", example="2026-07-15", description="Required when is_annual=false (one-off holiday date)")
 * )
 */
class StoreHolidayDefinitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'type' => ['required', 'in:obligatorio,asueto,opcional'],
            'pay_multiplier' => ['required_if:type,opcional', 'nullable', 'numeric', 'min:1', 'max:9.99'],
            'is_annual' => ['boolean'],
            'recurrence_type' => ['required', 'in:fixed,nth_weekday,floating,none'],
            'recurrence_config' => ['array'],
            'recurrence_config.month' => ['required_if:recurrence_type,fixed', 'required_if:recurrence_type,nth_weekday', 'integer', 'min:1', 'max:12'],
            'recurrence_config.day' => ['required_if:recurrence_type,fixed', 'integer', 'min:1', 'max:31'],
            'recurrence_config.week' => ['required_if:recurrence_type,nth_weekday', 'integer', 'min:1', 'max:5'],
            'recurrence_config.weekday' => ['required_if:recurrence_type,nth_weekday', 'integer', 'min:1', 'max:7'],
            'date' => [Rule::requiredIf(fn () => ! $this->boolean('is_annual')), 'nullable', 'date_format:Y-m-d'],
        ];
    }
}
