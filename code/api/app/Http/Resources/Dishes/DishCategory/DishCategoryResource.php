<?php

declare(strict_types=1);

namespace App\Http\Resources\Dishes\DishCategory;

use App\Http\Resources\BaseResource;
use App\Models\DishCategory;

/**
 * @mixin DishCategory
 *
 * @OA\Schema(
 *     schema="DishCategoryResponse",
 *     title="Dish Category Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="name", type="string", example="Rollos"),
 *     @OA\Property(property="position", type="integer"),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="dishes_count", type="integer", example=12),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 */
class DishCategoryResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'position' => $this->position,
            'is_active' => $this->is_active,
            'dishes_count' => $this->whenCounted('dishes'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
