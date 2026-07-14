<?php

namespace App\Http\Resources\VacationPolicy;

use App\Http\Resources\BaseResource;
use App\Models\VacationPolicyTier;

/**
 * @mixin VacationPolicyTier
 *
 * @OA\Schema(
 *     schema="VacationPolicyTierResponse",
 *     title="Vacation Policy Tier Response",
 *
 *     @OA\Property(property="id", type="string", example="01HXYZ"),
 *     @OA\Property(property="years_from", type="integer", example=1),
 *     @OA\Property(property="days", type="integer", example=18),
 *     @OA\Property(property="sort_order", type="integer", example=1)
 * )
 */
class VacationPolicyTierResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'years_from' => $this->years_from,
            'days' => $this->days,
            'sort_order' => $this->sort_order,
        ];
    }
}
