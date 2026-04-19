<?php

namespace App\Http\Resources\Schedule;

use App\Http\Resources\BaseResource;

/**
 * @OA\Schema(
 *     schema="ScheduleHistoryResponse",
 *     title="Schedule History Response",
 *     description="Schedule with overrides filtered to those active during the schedule's effective range",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="effective_from", type="string", format="date", example="2026-03-01"),
 *     @OA\Property(property="effective_to", type="string", format="date", nullable=true, example=null),
 *     @OA\Property(property="workday_type", type="string", enum={"FULL","PARTIAL"}, example="FULL"),
 *     @OA\Property(property="working_days_per_week", type="integer", example=5),
 *     @OA\Property(
 *         property="days",
 *         type="array",
 *
 *         @OA\Items(ref="#/components/schemas/ScheduleDayResponse")
 *     ),
 *
 *     @OA\Property(
 *         property="overrides",
 *         type="array",
 *         description="Overrides whose effective_from falls within this schedule's date range",
 *
 *         @OA\Items(ref="#/components/schemas/ScheduleDayOverrideResponse")
 *     ),
 *
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class ScheduleHistoryResource extends BaseResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'workday_type' => $this->workday_type,
            'working_days_per_week' => $this->working_days_per_week,
            'days' => ScheduleDayResource::collection($this->whenLoaded('scheduleDays')),
            'overrides' => $this->whenLoaded('employmentPeriod', function () {
                if (! $this->employmentPeriod->relationLoaded('scheduleDayOverrides')) {
                    return [];
                }

                $scheduleStart = $this->effective_from?->toDateString();
                $scheduleEnd = $this->effective_to?->toDateString();

                // Filter overrides whose effective_from falls within this schedule's active range
                // For active schedules (no end date), include all overrides starting from schedule start
                // including future-dated ones
                $filteredOverrides = $this->employmentPeriod->scheduleDayOverrides->filter(
                    function ($o) use ($scheduleStart, $scheduleEnd) {
                        $overrideStart = $o->effective_from?->toDateString();
                        if ($overrideStart < $scheduleStart) {
                            return false;
                        }
                        // If schedule has an end date, override must start on or before it
                        if ($scheduleEnd !== null && $overrideStart > $scheduleEnd) {
                            return false;
                        }

                        return true;
                    }
                )->values();

                // Set the employmentPeriod relation so the resource can include employment_period_id
                $filteredOverrides->each(fn ($o) => $o->setRelation('employmentPeriod', $this->employmentPeriod));

                return ScheduleDayOverrideResource::collection($filteredOverrides);
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
