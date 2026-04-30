<?php

namespace App\Http\Resources\Punctuality;

use App\Http\Resources\BaseResource;
use App\Models\PunctualityRange;

/**
 * @mixin PunctualityRange
 *
 * @OA\Schema(
 *     schema="PunctualityRangeResponse",
 *     title="Punctuality Range Response",
 *
 *     @OA\Property(property="id", type="string", example="01HXYZ"),
 *     @OA\Property(property="min_seconds", type="integer", example=0),
 *     @OA\Property(property="max_seconds", type="integer", nullable=true, example=599),
 *     @OA\Property(property="bonus_percentage", type="number", format="float", example=100.0),
 *     @OA\Property(property="sort_order", type="integer", example=1)
 * )
 */
class PunctualityRangeResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'min_seconds' => $this->min_seconds,
            'max_seconds' => $this->max_seconds,
            'bonus_percentage' => (float) $this->bonus_percentage,
            'sort_order' => $this->sort_order,
        ];
    }
}
