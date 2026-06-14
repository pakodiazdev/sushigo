<?php

namespace App\Http\Resources\Holiday;

use App\Http\Resources\BaseResource;
use App\Models\Holiday;

/**
 * @mixin Holiday
 *
 * @OA\Schema(
 *     schema="HolidayResponse",
 *     title="Holiday Response",
 *
 *     @OA\Property(property="id", type="integer", example=1, description="Holiday ID"),
 *     @OA\Property(property="date", type="string", format="date", example="2026-01-01"),
 *     @OA\Property(property="name", type="string", example="New Year's Day"),
 *     @OA\Property(property="pay_multiplier", type="number", format="float", example=2.00),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-01-01T00:00:00+00:00")
 * )
 */
class HolidayResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date->toDateString(),
            'name' => $this->name,
            'pay_multiplier' => (float) $this->pay_multiplier,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
