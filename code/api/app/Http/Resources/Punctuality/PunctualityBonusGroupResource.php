<?php

namespace App\Http\Resources\Punctuality;

use App\Http\Resources\BaseResource;
use App\Models\PunctualityBonusGroup;

/**
 * @mixin PunctualityBonusGroup
 *
 * @OA\Schema(
 *     schema="PunctualityBonusGroupResponse",
 *     title="Punctuality Bonus Group Response",
 *
 *     @OA\Property(property="id", type="string", example="01HXYZ"),
 *     @OA\Property(property="name", type="string", example="Grupo $110 (÷6)"),
 *     @OA\Property(property="weekly_bonus_amount", type="number", format="float", example=110.0),
 *     @OA\Property(property="working_days_divisor", type="integer", example=6),
 *     @OA\Property(property="daily_bonus_amount", type="number", format="float", example=18.33),
 *     @OA\Property(property="is_active", type="boolean", example=true)
 * )
 */
class PunctualityBonusGroupResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'weekly_bonus_amount' => (float) $this->weekly_bonus_amount,
            'working_days_divisor' => $this->working_days_divisor,
            'daily_bonus_amount' => $this->dailyBonusAmount(),
            'is_active' => $this->is_active,
        ];
    }
}
