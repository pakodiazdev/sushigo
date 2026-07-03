<?php

namespace App\Http\Resources\Overtime;

use App\Http\Resources\BaseResource;
use App\Models\OvertimePayConfig;

/**
 * @mixin OvertimePayConfig
 *
 * @OA\Schema(
 *     schema="OvertimePayConfigResponse",
 *     title="Overtime Pay Config Response",
 *
 *     @OA\Property(property="id", type="string", example="01HXYZ"),
 *     @OA\Property(property="valuation_method", type="string", enum={"LFT_PROPORTIONAL", "AGREED_RATE"}, example="AGREED_RATE"),
 *     @OA\Property(property="lft_factor", type="number", format="float", nullable=true, example=null),
 *     @OA\Property(property="hourly_rate", type="number", format="float", nullable=true, example=90.00),
 *     @OA\Property(property="effective_from", type="string", format="date", example="2026-05-01"),
 *     @OA\Property(property="effective_to", type="string", format="date", nullable=true, example=null)
 * )
 */
class OvertimePayConfigResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'valuation_method' => $this->valuation_method->value,
            'lft_factor' => $this->lft_factor !== null ? (float) $this->lft_factor : null,
            'hourly_rate' => $this->hourly_rate !== null ? (float) $this->hourly_rate : null,
            'effective_from' => $this->effective_from->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
        ];
    }
}
