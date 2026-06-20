<?php

declare(strict_types=1);

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
 *     @OA\Property(property="type", type="string", nullable=true, enum={"obligatorio","asueto","opcional"}),
 *     @OA\Property(property="pay_multiplier", type="number", format="float", example=3.00),
 *     @OA\Property(property="is_auto_generated", type="boolean", example=true),
 *     @OA\Property(property="definition_id", type="integer", nullable=true, example=1),
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
            'type' => $this->type,
            'pay_multiplier' => (float) $this->pay_multiplier,
            'is_auto_generated' => $this->is_auto_generated,
            'definition_id' => $this->definition_id,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
