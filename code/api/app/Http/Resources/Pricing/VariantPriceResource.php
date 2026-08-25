<?php

declare(strict_types=1);

namespace App\Http\Resources\Pricing;

use App\Http\Resources\BaseResource;
use App\Models\VariantPrice;

/**
 * @mixin VariantPrice
 *
 * @OA\Schema(
 *     schema="VariantPriceResponse",
 *     title="Variant Price Response",
 *
 *     @OA\Property(property="id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD"),
 *     @OA\Property(property="item_variant_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD"),
 *     @OA\Property(property="price_list_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD"),
 *     @OA\Property(property="price", type="string", example="129.5000"),
 *     @OA\Property(property="effective_from", type="string", format="date"),
 *     @OA\Property(property="effective_to", type="string", format="date", nullable=true),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class VariantPriceResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'item_variant_id' => $this->whenLoaded('itemVariant', fn () => $this->itemVariant?->public_id),
            'price_list_id' => $this->whenLoaded('priceList', fn () => $this->priceList?->public_id),
            'price' => (string) $this->price,
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
