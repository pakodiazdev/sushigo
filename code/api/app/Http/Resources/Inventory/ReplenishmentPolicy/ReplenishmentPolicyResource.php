<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\ReplenishmentPolicy;

use App\Http\Resources\BaseResource;
use App\Models\VariantLocationReplenishmentPolicy;

/**
 * @mixin VariantLocationReplenishmentPolicy
 *
 * @OA\Schema(
 *     schema="ReplenishmentPolicyResponse",
 *     title="Replenishment Policy Response",
 *
 *     @OA\Property(property="id", type="string", nullable=true, example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier; null when no policy is configured for the pair yet"),
 *     @OA\Property(property="inventory_location_id", type="string", example="01JKLOC1234567890ABCDEFGH"),
 *     @OA\Property(property="item_variant_id", type="string", example="01JKVAR1234567890ABCDEFGH"),
 *     @OA\Property(property="min_stock", type="number", format="float", example=10),
 *     @OA\Property(property="max_stock", type="number", format="float", example=120),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Bar fridge only holds two crates"),
 *     @OA\Property(property="is_configured", type="boolean", example=true, description="False for the synthetic 'no policy configured yet' response of the show endpoint"),
 *     @OA\Property(property="created_at", type="string", format="date-time", nullable=true),
 *     @OA\Property(property="updated_at", type="string", format="date-time", nullable=true)
 * )
 */
class ReplenishmentPolicyResource extends BaseResource
{
    /**
     * Every controller that returns this resource loads `inventoryLocation` and
     * `itemVariant` first — including on the synthetic un-persisted instance the
     * show endpoint hands back when nothing is configured yet.
     *
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'inventory_location_id' => $this->inventoryLocation?->public_id,
            'item_variant_id' => $this->itemVariant?->public_id,
            'min_stock' => (float) $this->min_stock,
            'max_stock' => (float) $this->max_stock,
            'notes' => $this->notes,
            'is_configured' => $this->exists,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
