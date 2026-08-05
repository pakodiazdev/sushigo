<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\DishCategory;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="StoreDishCategoryRequest",
 *   required={"name"},
 *
 *   @OA\Property(property="name", type="string", maxLength=255, example="Rollos"),
 *   @OA\Property(property="position", type="integer", example=0, description="Display order (default: 0)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)")
 * )
 */
class StoreDishCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function categoryData(): array
    {
        $data = $this->validated();
        $data['position'] ??= 0;
        $data['is_active'] ??= true;

        return $data;
    }
}
