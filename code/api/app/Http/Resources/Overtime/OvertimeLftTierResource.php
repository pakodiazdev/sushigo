<?php

namespace App\Http\Resources\Overtime;

use App\Http\Resources\BaseResource;
use App\Models\OvertimeLftTier;

/**
 * @mixin OvertimeLftTier
 *
 * @OA\Schema(
 *     schema="OvertimeLftTierResponse",
 *     title="Overtime LFT Tier Response",
 *
 *     @OA\Property(property="id", type="string", example="01HXYZ"),
 *     @OA\Property(property="factor", type="number", format="float", example=2.0),
 *     @OA\Property(property="up_to_hours", type="number", format="float", nullable=true, example=9.0),
 *     @OA\Property(property="sort_order", type="integer", example=1)
 * )
 */
class OvertimeLftTierResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'factor' => (float) $this->factor,
            'up_to_hours' => $this->up_to_hours !== null ? (float) $this->up_to_hours : null,
            'sort_order' => $this->sort_order,
        ];
    }
}
