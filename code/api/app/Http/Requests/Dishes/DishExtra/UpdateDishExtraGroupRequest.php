<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\DishExtra;

use App\Models\DishExtraGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateDishExtraGroupRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255),
 *   @OA\Property(property="is_required", type="boolean"),
 *   @OA\Property(property="selection_type", type="string", enum={"SINGLE", "MULTIPLE"})
 * )
 */
class UpdateDishExtraGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'is_required' => ['sometimes', 'boolean'],
            'selection_type' => ['sometimes', 'string', Rule::in([DishExtraGroup::SELECTION_SINGLE, DishExtraGroup::SELECTION_MULTIPLE])],
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
        return $this->validated();
    }
}
