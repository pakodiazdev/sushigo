<?php

declare(strict_types=1);

namespace App\Http\Resources\Pricing;

use App\Http\Resources\BaseResource;
use App\Models\PriceListAssignment;

/**
 * @mixin PriceListAssignment
 *
 * @OA\Schema(
 *     schema="PriceListAssignmentResponse",
 *     title="Price List Assignment Response",
 *
 *     @OA\Property(property="id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD"),
 *     @OA\Property(property="price_list_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD"),
 *     @OA\Property(property="branch_id", type="integer", example=1),
 *     @OA\Property(property="operating_unit_id", type="integer", nullable=true, example=1),
 *     @OA\Property(property="effective_from", type="string", format="date"),
 *     @OA\Property(property="effective_to", type="string", format="date", nullable=true),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class PriceListAssignmentResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'price_list_id' => $this->whenLoaded('priceList', fn () => $this->priceList?->public_id),
            'branch_id' => $this->branch_id,
            'operating_unit_id' => $this->operating_unit_id,
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
