<?php

declare(strict_types=1);

namespace App\Http\Resources\Dishes\DishExtra;

use App\Http\Resources\BaseResource;
use App\Models\DishExtraGroup;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @mixin DishExtraGroup
 *
 * @OA\Schema(
 *     schema="DishExtraGroupResponse",
 *     title="Dish Extra Group Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="dish_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Dish public_id (ULID)"),
 *     @OA\Property(property="name", type="string", example="Elige tu salsa"),
 *     @OA\Property(property="is_required", type="boolean"),
 *     @OA\Property(property="selection_type", type="string", enum={"SINGLE", "MULTIPLE"}),
 *     @OA\Property(property="options", type="array", description="Active options only — matches Dish::totalPriceFor()'s pricing scope", @OA\Items(ref="#/components/schemas/DishExtraOptionResponse")),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 */
class DishExtraGroupResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'dish_id' => $this->dish->public_id,
            'name' => $this->name,
            'is_required' => $this->is_required,
            'selection_type' => $this->selection_type,
            'options' => $this->whenLoaded(
                'options',
                fn (): AnonymousResourceCollection => DishExtraOptionResource::collection($this->options)
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
