<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\Brand;

use App\Http\Resources\BaseResource;
use App\Models\Brand;

/**
 * @mixin Brand
 *
 * @OA\Schema(
 *     schema="BrandResponse",
 *     title="Brand Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="name", type="string", example="Coca-Cola"),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 */
class BrandResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
