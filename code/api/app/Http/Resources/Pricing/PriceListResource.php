<?php

declare(strict_types=1);

namespace App\Http\Resources\Pricing;

use App\Http\Resources\BaseResource;
use App\Models\PriceList;

/**
 * @mixin PriceList
 *
 * @OA\Schema(
 *     schema="PriceListResponse",
 *     title="Price List Response",
 *
 *     @OA\Property(property="id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD"),
 *     @OA\Property(property="code", type="string", example="STANDARD"),
 *     @OA\Property(property="name", type="string", example="Standard Pricing"),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="priority", type="integer", example=0),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class PriceListResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'priority' => $this->priority,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
