<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\Dish;

use App\Http\Requests\Dishes\Dish\Concerns\NormalizesDishData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateDishRequest",
 *
 *   @OA\Property(property="dish_category_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Dish category public_id (ULID)"),
 *   @OA\Property(property="name", type="string", maxLength=255),
 *   @OA\Property(property="description", type="string", nullable=true),
 *   @OA\Property(property="base_price", type="number", format="float"),
 *   @OA\Property(property="is_active", type="boolean"),
 *   @OA\Property(property="position", type="integer")
 * )
 */
class UpdateDishRequest extends FormRequest
{
    use NormalizesDishData;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dish_category_id' => ['sometimes', 'string', Rule::exists('dish_categories', 'public_id')->whereNull('deleted_at')],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_price' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function dishData(): array
    {
        return $this->normalizedDishData(applyCreateDefaults: false);
    }
}
