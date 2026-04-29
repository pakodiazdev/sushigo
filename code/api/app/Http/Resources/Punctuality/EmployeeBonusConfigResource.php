<?php

namespace App\Http\Resources\Punctuality;

use App\Http\Resources\BaseResource;
use App\Models\EmployeeBonusConfig;

/**
 * @mixin EmployeeBonusConfig
 *
 * @OA\Schema(
 *     schema="EmployeeBonusConfigResponse",
 *     title="Employee Bonus Config Response",
 *
 *     @OA\Property(property="id", type="string", example="01HXYZ"),
 *     @OA\Property(property="bonus_group_id", type="string", example="01HABC"),
 *     @OA\Property(property="bonus_group_name", type="string", example="Grupo $110"),
 *     @OA\Property(property="weekly_bonus_amount", type="number", format="float", example=110.00),
 *     @OA\Property(property="daily_bonus_amount", type="number", format="float", example=18.33),
 *     @OA\Property(property="effective_from", type="string", format="date", example="2026-05-01"),
 *     @OA\Property(property="effective_to", type="string", format="date", nullable=true, example=null)
 * )
 */
class EmployeeBonusConfigResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'bonus_group_id' => $this->bonusGroup->public_id,
            'bonus_group_name' => $this->bonusGroup->name,
            'weekly_bonus_amount' => (float) $this->bonusGroup->weekly_bonus_amount,
            'daily_bonus_amount' => $this->bonusGroup->dailyBonusAmount(),
            'effective_from' => $this->effective_from->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
        ];
    }
}
