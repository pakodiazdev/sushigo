<?php

declare(strict_types=1);

namespace App\Http\Requests\Dishes\DishExtra;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateDishExtraOptionRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255),
 *   @OA\Property(property="price_delta", type="number", format="float"),
 *   @OA\Property(property="is_active", type="boolean"),
 *   @OA\Property(property="position", type="integer")
 * )
 */
class UpdateDishExtraOptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'price_delta' => ['sometimes', 'numeric'],
            'is_active' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function extraOptionData(): array
    {
        return $this->validated();
    }
}
