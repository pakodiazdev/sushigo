<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\Dish;

use App\Http\Requests\Dishes\Dish\Concerns\NormalizesDishData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreDishRequest",
 *   required={"dish_category_id", "name", "base_price"},
 *
 *   @OA\Property(property="dish_category_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Dish category public_id (ULID)"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="California Roll"),
 *   @OA\Property(property="description", type="string", nullable=true, example="Kanikama, aguacate, pepino"),
 *   @OA\Property(property="base_price", type="number", format="float", example=120.00),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 *   @OA\Property(property="position", type="integer", example=0, description="Display order within category (default: 0)")
 * )
 */
class StoreDishRequest extends FormRequest
{
    use NormalizesDishData;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dish_category_id' => ['required', 'string', Rule::exists('dish_categories', 'public_id')->whereNull('deleted_at')],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function dishData(): array
    {
        return $this->normalizedDishData(applyCreateDefaults: true);
    }
}
