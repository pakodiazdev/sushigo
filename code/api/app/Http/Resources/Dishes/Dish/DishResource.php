<?php

declare(strict_types=1);

namespace App\Http\Resources\Dishes\Dish;

use App\Http\Resources\BaseResource;
use App\Http\Resources\Dishes\DishExtra\DishExtraGroupResource;
use App\Models\Dish;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @mixin Dish
 *
 * @OA\Schema(
 *     schema="DishResponse",
 *     title="Dish Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="dish_category_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Dish category public_id (ULID)"),
 *     @OA\Property(property="name", type="string", example="California Roll"),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="base_price", type="number", format="float", example=120.00),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="position", type="integer"),
 *     @OA\Property(property="extra_groups", type="array", @OA\Items(ref="#/components/schemas/DishExtraGroupResponse")),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 */
class DishResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'dish_category_id' => $this->category->public_id,
            'name' => $this->name,
            'description' => $this->description,
            'base_price' => (float) $this->base_price,
            'is_active' => $this->is_active,
            'position' => $this->position,
            'extra_groups' => $this->whenLoaded(
                'extraGroups',
                fn (): AnonymousResourceCollection => DishExtraGroupResource::collection($this->extraGroups)
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
