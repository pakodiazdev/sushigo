<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\VariantAssignment;

use App\Http\Resources\BaseResource;
use App\Models\ItemVariant;

/**
 * Variant-centric view of the managed-assortment state for one
 * (Inventory Location, Variant) pair (#569).
 *
 * The list endpoint returns one of these per candidate Variant, whether or not
 * it is currently assigned, so a Variant picker can render assigned and
 * assignable Variants from a single paginated response. The assign endpoint
 * returns the same shape for the single pair it just wrote.
 *
 * The resource wraps an ItemVariant that the controller decorated with three
 * non-persisted attributes:
 *   - `assignment_public_id` — the live assignment's public_id, or null
 *   - `assigned_at`          — the live assignment's created_at ISO string, or null
 *   - `location_public_id`   — the Inventory Location this state is scoped to
 *
 * @mixin ItemVariant
 *
 * @OA\Schema(
 *     schema="VariantLocationAssignmentResponse",
 *     title="Variant Location Assignment Response",
 *
 *     @OA\Property(property="assignment_id", type="string", nullable=true, example="01JKASG1234567890ABCDEFGH", description="ULID of the live assignment; null when the Variant is not assigned at this Location"),
 *     @OA\Property(property="assigned", type="boolean", example=true, description="Whether the Variant is currently managed at this Location"),
 *     @OA\Property(property="inventory_location_id", type="string", example="01JKLOC1234567890ABCDEFGH"),
 *     @OA\Property(property="item_variant_id", type="string", example="01JKVAR1234567890ABCDEFGH"),
 *     @OA\Property(property="item_variant_code", type="string", example="RICE-1KG"),
 *     @OA\Property(property="item_variant_name", type="string", example="Sushi Rice 1kg"),
 *     @OA\Property(property="assigned_at", type="string", format="date-time", nullable=true)
 * )
 */
class VariantLocationAssignmentResource extends BaseResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'assignment_id' => $this->assignment_public_id,
            'assigned' => $this->assignment_public_id !== null,
            'inventory_location_id' => $this->location_public_id,
            'item_variant_id' => $this->public_id,
            'item_variant_code' => $this->code,
            'item_variant_name' => $this->name,
            'assigned_at' => $this->assigned_at,
        ];
    }
}
