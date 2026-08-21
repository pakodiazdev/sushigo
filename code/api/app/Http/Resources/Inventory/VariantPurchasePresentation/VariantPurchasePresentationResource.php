<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\VariantPurchasePresentation;

use App\Http\Resources\BaseResource;
use App\Models\VariantPurchasePresentation;

/**
 * @mixin VariantPurchasePresentation
 *
 * @OA\Schema(
 *     schema="VariantPurchasePresentationResponse",
 *     title="Variant Purchase Presentation Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="item_variant_id", type="integer", example=42),
 *     @OA\Property(property="template", type="object", description="Lean template summary — id, code, name, package_type, base_unit_quantity only. Fetch /inventory/purchase-presentation-templates/{template} for the full resource.",
 *         @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *         @OA\Property(property="code", type="string", example="BOX_24"),
 *         @OA\Property(property="name", type="string", example="Box x24"),
 *         @OA\Property(property="package_type", type="string", example="BOX"),
 *         @OA\Property(property="base_unit_quantity", type="number", format="float", example=24)
 *     ),
 *     @OA\Property(property="package_barcode", type="string", nullable=true, example="7501234567913"),
 *     @OA\Property(property="is_default", type="boolean"),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class VariantPurchasePresentationResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'item_variant_id' => $this->item_variant_id,
            'template' => $this->whenLoaded('template', fn () => $this->template ? [
                'id' => $this->template->public_id,
                'code' => $this->template->code,
                'name' => $this->template->name,
                'package_type' => $this->template->package_type,
                'base_unit_quantity' => (float) $this->template->base_unit_quantity,
            ] : null),
            'package_barcode' => $this->package_barcode,
            'is_default' => $this->is_default,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
