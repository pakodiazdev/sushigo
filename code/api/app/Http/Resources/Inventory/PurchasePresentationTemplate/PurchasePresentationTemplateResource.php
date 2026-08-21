<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\PurchasePresentationTemplate;

use App\Http\Resources\BaseResource;
use App\Models\PurchasePresentationTemplate;

/**
 * @mixin PurchasePresentationTemplate
 *
 * @OA\Schema(
 *     schema="PurchasePresentationTemplateResponse",
 *     title="Purchase Presentation Template Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="code", type="string", example="BOX_24"),
 *     @OA\Property(property="name", type="string", example="Box x24"),
 *     @OA\Property(property="package_type", type="string", example="BOX"),
 *     @OA\Property(property="base_unit_quantity", type="number", format="float", example=24),
 *     @OA\Property(property="compatible_dimension_uom", type="object",
 *         @OA\Property(property="id", type="integer"),
 *         @OA\Property(property="code", type="string"),
 *         @OA\Property(property="name", type="string"),
 *         @OA\Property(property="symbol", type="string")
 *     ),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class PurchasePresentationTemplateResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'code' => $this->code,
            'name' => $this->name,
            'package_type' => $this->package_type,
            'base_unit_quantity' => (float) $this->base_unit_quantity,
            'compatible_dimension_uom' => $this->whenLoaded('compatibleUom', fn () => $this->compatibleUom ? [
                'id' => $this->compatibleUom->id,
                'code' => $this->compatibleUom->code,
                'name' => $this->compatibleUom->name,
                'symbol' => $this->compatibleUom->symbol,
            ] : null),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
