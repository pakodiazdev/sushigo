<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\InventoryCategory;

use App\Http\Resources\BaseResource;
use App\Models\InventoryCategory;

/**
 * @mixin InventoryCategory
 *
 * @OA\Schema(
 *     schema="InventoryCategoryResponse",
 *     title="Inventory Category Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="name", type="string", example="Beverages"),
 *     @OA\Property(property="position", type="integer"),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 */
class InventoryCategoryResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'position' => $this->position,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
