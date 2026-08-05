<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\DishExtra;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\DishExtraGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreDishExtraOptionRequest",
 *   required={"dish_extra_group_id", "name"},
 *
 *   @OA\Property(property="dish_extra_group_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Dish extra group public_id (ULID)"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Salsa de soya"),
 *   @OA\Property(property="price_delta", type="number", format="float", example=0, description="Added to the dish base_price when selected (default: 0)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 *   @OA\Property(property="position", type="integer", example=0, description="Display order within group (default: 0)")
 * )
 */
class StoreDishExtraOptionRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dish_extra_group_id' => ['required', 'string', Rule::exists('dish_extra_groups', 'public_id')->whereNull('deleted_at')],
            'name' => ['required', 'string', 'max:255'],
            'price_delta' => ['nullable', 'numeric'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function extraOptionData(): array
    {
        $data = $this->validated();

        if (array_key_exists('dish_extra_group_id', $data)) {
            $data['dish_extra_group_id'] = $this->resolvePublicIdValue(DishExtraGroup::class, $data['dish_extra_group_id']);
        }

        $data['price_delta'] ??= 0;
        $data['is_active'] ??= true;
        $data['position'] ??= 0;

        return $data;
    }
}
