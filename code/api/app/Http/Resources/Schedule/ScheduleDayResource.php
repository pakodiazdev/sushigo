<?php

namespace App\Http\Resources\Schedule;

use Illuminate\Http\Resources\Json\JsonResource;

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
