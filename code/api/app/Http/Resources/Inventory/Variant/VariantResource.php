<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\Variant;

use App\Http\Resources\BaseResource;
use App\Models\ItemVariant;

/**
 * Catalog identity only — no cost, price, or stock fields. Uses
 * ItemVariant's numeric id (not public_id) — see this PR's Assumptions note:
 * #399 (public_id rollout for the Inventory domain) hasn't landed yet.
 *
 * @mixin ItemVariant
 *
 * @OA\Schema(
 *     schema="VariantResponse",
 *     title="Variant Response",
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="item_id", type="integer", example=42),
 *     @OA\Property(property="code", type="string", example="ARR-KG"),
 *     @OA\Property(property="barcode", type="string", nullable=true, example="7501234567890"),
 *     @OA\Property(property="name", type="string", example="Arroz Premium 1kg"),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="uom", type="object",
 *         @OA\Property(property="id", type="integer"),
 *         @OA\Property(property="code", type="string"),
 *         @OA\Property(property="name", type="string"),
 *         @OA\Property(property="symbol", type="string")
 *     ),
 *     @OA\Property(property="track_lot", type="boolean"),
 *     @OA\Property(property="track_serial", type="boolean"),
 *     @OA\Property(property="is_active", type="boolean"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class VariantResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'item_id' => $this->whenLoaded('item', fn () => $this->item?->public_id),
            'code' => $this->code,
            'barcode' => $this->barcode,
            'name' => $this->name,
            'description' => $this->description,
            'uom' => $this->whenLoaded('unitOfMeasure', fn () => $this->unitOfMeasure ? [
                'id' => $this->unitOfMeasure->public_id,
                'code' => $this->unitOfMeasure->code,
                'name' => $this->unitOfMeasure->name,
                'symbol' => $this->unitOfMeasure->symbol,
            ] : null),
            'track_lot' => $this->track_lot,
            'track_serial' => $this->track_serial,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
