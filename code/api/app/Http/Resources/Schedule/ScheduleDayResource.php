<?php

namespace App\Http\Resources\Schedule;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @OA\Schema(
 *     schema="ScheduleDayResponse",
 *     title="Schedule Day Response",
 *
 *     @OA\Property(property="day_of_week", type="integer", example=1, description="ISO day of week (1=Monday, 7=Sunday)"),
 *     @OA\Property(property="is_day_off", type="boolean", example=false),
 *     @OA\Property(property="expected_start", type="string", nullable=true, example="09:00"),
 *     @OA\Property(property="expected_lunch_start", type="string", nullable=true, example="13:00"),
 *     @OA\Property(property="expected_lunch_end", type="string", nullable=true, example="14:00"),
 *     @OA\Property(property="lunch_duration_minutes", type="integer", nullable=true, example=60),
 *     @OA\Property(property="expected_end", type="string", nullable=true, example="18:00")
 * )
 */
class ScheduleDayResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'day_of_week' => $this->day_of_week,
            'is_day_off' => $this->is_day_off,
            'expected_start' => $this->expected_start?->format('H:i'),
            'expected_lunch_start' => $this->expected_lunch_start?->format('H:i'),
            'expected_lunch_end' => $this->expected_lunch_end?->format('H:i'),
            'lunch_duration_minutes' => $this->lunch_duration_minutes,
            'expected_end' => $this->expected_end?->format('H:i'),
        ];
    }
}
