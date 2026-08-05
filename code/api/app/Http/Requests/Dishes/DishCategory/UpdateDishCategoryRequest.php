<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\DishCategory;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateDishCategoryRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255),
 *   @OA\Property(property="position", type="integer"),
 *   @OA\Property(property="is_active", type="boolean")
 * )
 */
class UpdateDishCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function categoryData(): array
    {
        return $this->validated();
    }
}
