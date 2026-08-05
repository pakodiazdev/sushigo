<?php

declare(strict_types=1);

namespace App\Http\Resources\Dishes\DishExtra;

use App\Http\Resources\BaseResource;
use App\Models\DishExtraOption;

/**
 * @mixin DishExtraOption
 *
 * @OA\Schema(
 *     schema="DishExtraOptionResponse",
 *     title="Dish Extra Option Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="dish_extra_group_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Dish extra group public_id (ULID)"),
 *     @OA\Property(property="name", type="string", example="Salsa de soya"),
 *     @OA\Property(property="price_delta", type="number", format="float", example=0),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="position", type="integer"),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 */
class DishExtraOptionResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'dish_extra_group_id' => $this->extraGroup->public_id,
            'name' => $this->name,
            'price_delta' => (float) $this->price_delta,
            'is_active' => $this->is_active,
            'position' => $this->position,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
