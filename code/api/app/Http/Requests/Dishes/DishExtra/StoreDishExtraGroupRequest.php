<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\DishExtra;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\Dish;
use App\Models\DishExtraGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreDishExtraGroupRequest",
 *   required={"dish_id", "name", "selection_type"},
 *
 *   @OA\Property(property="dish_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Dish public_id (ULID)"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Elige tu salsa"),
 *   @OA\Property(property="is_required", type="boolean", example=false, description="Default: false"),
 *   @OA\Property(property="selection_type", type="string", enum={"SINGLE", "MULTIPLE"}, example="SINGLE")
 * )
 */
class StoreDishExtraGroupRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dish_id' => ['required', 'string', Rule::exists('dishes', 'public_id')->whereNull('deleted_at')],
            'name' => ['required', 'string', 'max:255'],
            'is_required' => ['nullable', 'boolean'],
            'selection_type' => ['required', 'string', Rule::in([DishExtraGroup::SELECTION_SINGLE, DishExtraGroup::SELECTION_MULTIPLE])],
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->filled('selection_type')) {
            $this->merge(['selection_type' => strtoupper((string) $this->selection_type)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function extraGroupData(): array
    {
        $data = $this->validated();

        if (array_key_exists('dish_id', $data)) {
            $data['dish_id'] = $this->resolvePublicIdValue(Dish::class, $data['dish_id']);
        }

        $data['is_required'] ??= false;

        return $data;
    }
}
