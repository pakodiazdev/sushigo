<?php

declare(strict_types=1);

namespace App\Http\Resources\Holiday;

use App\Http\Resources\BaseResource;
use App\Models\HolidayDefinition;

/**
 * @mixin HolidayDefinition
 *
 * @OA\Schema(
 *     schema="HolidayDefinitionResponse",
 *     title="Holiday Definition Response",
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Independence Day"),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="type", type="string", enum={"obligatorio","asueto","opcional"}),
 *     @OA\Property(property="pay_multiplier", type="number", format="float", example=3.00),
 *     @OA\Property(property="effective_pay_multiplier", type="number", format="float", example=3.00),
 *     @OA\Property(property="is_annual", type="boolean"),
 *     @OA\Property(property="recurrence_type", type="string", enum={"fixed","nth_weekday","floating","none"}),
 *     @OA\Property(property="recurrence_config", type="object"),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 */
class HolidayDefinitionResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'type' => $this->type,
            'pay_multiplier' => (float) $this->pay_multiplier,
            'effective_pay_multiplier' => $this->getEffectivePayMultiplier(),
            'is_annual' => $this->is_annual,
            'recurrence_type' => $this->recurrence_type,
            'recurrence_config' => $this->recurrence_config,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
