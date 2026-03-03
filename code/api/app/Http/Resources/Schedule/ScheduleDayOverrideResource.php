<?php

namespace App\Http\Resources\Schedule;

use App\Http\Resources\BaseResource;

/**
 * @OA\Schema(
 *     schema="ScheduleDayOverrideResponse",
 *     title="Schedule Day Override Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="employment_period_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *     @OA\Property(property="day_of_week", type="integer", example=1, description="ISO 8601: 1=Monday … 7=Sunday"),
 *     @OA\Property(property="effective_from", type="string", format="date", example="2026-03-10"),
 *     @OA\Property(property="effective_to", type="string", format="date", nullable=true, example="2026-03-10"),
 *     @OA\Property(property="is_day_off", type="boolean", example=false),
 *     @OA\Property(property="expected_start", type="string", nullable=true, example="09:00"),
 *     @OA\Property(property="expected_lunch_start", type="string", nullable=true, example="14:00"),
 *     @OA\Property(property="expected_lunch_end", type="string", nullable=true, example="15:00"),
 *     @OA\Property(property="lunch_duration_minutes", type="integer", nullable=true, example=60),
 *     @OA\Property(property="expected_end", type="string", nullable=true, example="18:00"),
 *     @OA\Property(property="note", type="string", nullable=true, example="Paco llega tarde este lunes"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class ScheduleDayOverrideResource extends BaseResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id'                     => $this->public_id,
            'employment_period_id'   => $this->whenLoaded('employmentPeriod', fn () => $this->employmentPeriod->public_id),
            'day_of_week'            => $this->day_of_week,
            'effective_from'         => $this->effective_from?->toDateString(),
            'effective_to'           => $this->effective_to?->toDateString(),
            'is_day_off'             => $this->is_day_off,
            'expected_start'         => $this->expected_start?->format('H:i'),
            'expected_lunch_start'   => $this->expected_lunch_start?->format('H:i'),
            'expected_lunch_end'     => $this->expected_lunch_end?->format('H:i'),
            'lunch_duration_minutes' => $this->lunch_duration_minutes,
            'expected_end'           => $this->expected_end?->format('H:i'),
            'note'                   => $this->note,
            'created_at'             => $this->created_at,
            'updated_at'             => $this->updated_at,
        ];
    }
}
